"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { fieldErrors } from "@/lib/form-errors"

import { defaultChannel } from "@/integrations/notifications"
import { requireAdmin, requireStaff } from "@/lib/auth"
import { todaySP } from "@/lib/dates"
import { firstName } from "@/lib/format"
import { siteUrl } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import type { Enums } from "@/lib/supabase/database.types"
import { generateToken, hashToken } from "@/lib/tokens"
import { isValidPhone, onlyDigits, parseBRDate, parseHeightCm } from "@/lib/validation"
import { fillTemplate } from "@/lib/whatsapp"

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> }

const fail = (message: string, fieldErrors?: Record<string, string>) => ({ ok: false as const, message, fieldErrors })

/** Traduz erros do banco (triggers já mandam mensagens em pt-BR). */
function dbMessage(error: { message: string; code?: string }, fallback: string) {
  if (error.code === "P0001" || error.code === "42501") return error.message
  if (error.code === "23505" && error.message.includes("cpf")) return "Já existe um aluno com esse CPF."
  console.error(error)
  return fallback
}

const refresh = (studentId?: string) => {
  revalidatePath("/tarefas")
  revalidatePath("/alunos")
  if (studentId) revalidatePath(`/alunos/${studentId}`)
}

// ---------------------------------------------------------------------------
// Pré-cadastro e link
// ---------------------------------------------------------------------------
async function createInviteLink(studentId: string, name: string, phone: string) {
  const supabase = await createClient()
  const token = generateToken()
  const { error } = await supabase.from("student_invites").insert({ student_id: studentId, token_hash: hashToken(token) })
  if (error) throw error
  const { data: settings } = await supabase.from("studio_settings").select("msg_invite").single()
  const link = `${siteUrl()}/cadastro/${token}`
  const message = fillTemplate(settings?.msg_invite ?? "Oi, {primeiro_nome}! Preencha seu cadastro no Ritmus: {link}", {
    primeiro_nome: firstName(name),
    nome: name,
    link,
  })
  const delivery = await defaultChannel.send({ name, phone }, message)
  return { link, whatsappUrl: delivery.kind === "link" ? delivery.url : null }
}

const preSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Digite o nome do aluno.")
    .refine((v) => v.split(/\s+/).length >= 2, "Digite nome e sobrenome."),
  whatsapp: z.string().refine(isValidPhone, "Confira o WhatsApp com DDD, por exemplo (15) 99123-4567."),
})

export async function createPreRegistration(input: {
  full_name: string
  whatsapp: string
}): Promise<ActionResult<{ studentId: string; link: string; whatsappUrl: string | null }>> {
  await requireAdmin()
  const parsed = preSchema.safeParse(input)
  if (!parsed.success) {
    return fail("Confira os campos.", fieldErrors(parsed.error))
  }
  const supabase = await createClient()
  const whatsapp = onlyDigits(parsed.data.whatsapp)
  const name = parsed.data.full_name.replace(/\s+/g, " ")
  const { data: student, error } = await supabase
    .from("students")
    .insert({ full_name: name, whatsapp, status: "convidado" })
    .select("id")
    .single()
  if (error) return fail(dbMessage(error, "Não foi possível criar o pré-cadastro. Tente de novo."))
  try {
    const invite = await createInviteLink(student.id, name, whatsapp)
    refresh()
    return { ok: true, data: { studentId: student.id, ...invite } }
  } catch (e) {
    console.error(e)
    return fail("O aluno foi criado, mas o link não. Abra a ficha dele e toque em “Gerar novo link”.")
  }
}

export async function regenerateInvite(studentId: string): Promise<ActionResult<{ link: string; whatsappUrl: string | null }>> {
  await requireAdmin()
  const supabase = await createClient()
  const { data: s } = await supabase.from("students").select("full_name, whatsapp, status").eq("id", studentId).single()
  if (!s) return fail("Aluno não encontrado.")
  if (s.status !== "convidado") return fail("Este aluno já enviou o cadastro.")
  // Links anteriores deixam de valer.
  await supabase
    .from("student_invites")
    .update({ expires_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .is("used_at", null)
  try {
    const invite = await createInviteLink(studentId, s.full_name, s.whatsapp)
    refresh(studentId)
    return { ok: true, data: invite }
  } catch (e) {
    console.error(e)
    return fail("Não foi possível gerar o link agora. Tente de novo.")
  }
}

// ---------------------------------------------------------------------------
// Ativação
// ---------------------------------------------------------------------------
const activationSchema = z.object({
  studentId: z.uuid(),
  personalId: z.uuid({ message: "Escolha o personal responsável." }),
  weeklyFrequency: z.number().int().min(1, "Escolha a frequência.").max(6),
  slotIds: z.array(z.uuid()).max(6),
  feeCents: z.number().int().positive("O valor precisa ser maior que zero.").nullable(),
  dueDay: z.number().int().min(1, "Dia entre 1 e 31.").max(31, "Dia entre 1 e 31."),
})

export async function activateStudent(
  input: z.input<typeof activationSchema>,
): Promise<ActionResult<{ enrollmentIds: string[]; previousStatus: Enums<"student_status"> }>> {
  await requireAdmin()
  const parsed = activationSchema.safeParse(input)
  if (!parsed.success) {
    return fail("Confira os campos.", fieldErrors(parsed.error))
  }
  const d = parsed.data
  const supabase = await createClient()
  const { data: before } = await supabase.from("students").select("status").eq("id", d.studentId).single()
  const { data, error } = await supabase.rpc("activate_student", {
    p_student_id: d.studentId,
    p_personal_id: d.personalId,
    p_weekly_frequency: d.weeklyFrequency,
    p_slot_ids: d.slotIds,
    p_fee_cents: d.feeCents as number,
    p_due_day: d.dueDay,
  })
  if (error) return fail(dbMessage(error, "Não foi possível ativar agora. Tente de novo."))
  refresh(d.studentId)
  return { ok: true, data: { enrollmentIds: data ?? [], previousStatus: before?.status ?? "aguardando" } }
}

export async function undoActivation(
  studentId: string,
  enrollmentIds: string[],
  previousStatus: Enums<"student_status">,
): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()
  if (enrollmentIds.length) await supabase.from("enrollments").delete().in("id", enrollmentIds)
  const { error } = await supabase
    .from("students")
    .update({ status: previousStatus, ...(previousStatus === "aguardando" ? { activated_at: null, activated_by: null } : {}) })
    .eq("id", studentId)
  if (error) return fail(dbMessage(error, "Não foi possível desfazer."))
  refresh(studentId)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Liberação médica, valor e status
// ---------------------------------------------------------------------------
export async function registerClearance(studentId: string, dateBR: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const iso = parseBRDate(dateBR)
  if (!iso) return fail("Use o formato dd/mm/aaaa.", { date: "Use o formato dd/mm/aaaa." })
  if (iso > todaySP()) return fail("A data não pode ser no futuro.", { date: "A data não pode ser no futuro." })
  const supabase = await createClient()
  const { error } = await supabase
    .from("student_health")
    .update({ clearance_received_on: iso, clearance_registered_at: new Date().toISOString(), clearance_registered_by: admin.id })
    .eq("student_id", studentId)
  if (error) return fail(dbMessage(error, "Não foi possível registrar agora."))
  refresh(studentId)
  return { ok: true, data: undefined }
}

export async function undoClearance(studentId: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from("student_health")
    .update({ clearance_received_on: null, clearance_registered_at: null, clearance_registered_by: null })
    .eq("student_id", studentId)
  if (error) return fail(dbMessage(error, "Não foi possível desfazer."))
  refresh(studentId)
  return { ok: true, data: undefined }
}

export async function setMonthlyFee(
  studentId: string,
  feeCents: number | null,
  dueDay?: number,
): Promise<ActionResult<{ previousFee: number | null }>> {
  await requireAdmin()
  if (feeCents !== null && (!Number.isInteger(feeCents) || feeCents <= 0)) return fail("Digite um valor maior que zero.")
  if (dueDay !== undefined && (dueDay < 1 || dueDay > 31)) return fail("O vencimento é um dia entre 1 e 31.")
  const supabase = await createClient()
  const { data: before } = await supabase.from("student_billing").select("monthly_fee_cents").eq("student_id", studentId).maybeSingle()
  const { error } = await supabase
    .from("student_billing")
    .upsert({ student_id: studentId, monthly_fee_cents: feeCents, ...(dueDay ? { due_day: dueDay } : {}) })
  if (error) return fail(dbMessage(error, "Não foi possível salvar o valor."))
  refresh(studentId)
  return { ok: true, data: { previousFee: before?.monthly_fee_cents ?? null } }
}

export async function setStudentSchedule(studentId: string, slotIds: string[]): Promise<ActionResult> {
  await requireAdmin()
  if (slotIds.length > 6) return fail("Escolha no máximo 6 horários.")
  const supabase = await createClient()
  const { error } = await supabase.rpc("set_student_schedule", { p_student_id: studentId, p_slot_ids: slotIds })
  if (error) return fail(dbMessage(error, "Não deu para salvar os horários agora."))
  refresh(studentId)
  revalidatePath("/agenda", "layout")
  revalidatePath("/agora")
  return { ok: true, data: undefined }
}

export async function releaseStudent(studentId: string, status: "pausado" | "inativo"): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.rpc("release_student", { p_student_id: studentId, p_status: status })
  if (error) return fail(dbMessage(error, "Não foi possível mudar o status agora."))
  refresh(studentId)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Edição dos dados cadastrais (admin ou o personal do aluno; o RLS decide)
// ---------------------------------------------------------------------------
const editSchema = z.object({
  full_name: z.string().trim().min(3, "Digite o nome completo."),
  whatsapp: z.string().refine(isValidPhone, "Confira o WhatsApp com DDD."),
  email: z
    .string()
    .trim()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Esse e-mail não parece certo."),
  cep: z.string().refine((v) => !onlyDigits(v) || onlyDigits(v).length === 8, "O CEP tem 8 números."),
  street: z.string().trim(),
  number: z.string().trim(),
  complement: z.string().trim(),
  neighborhood: z.string().trim(),
  city: z.string().trim(),
  state: z
    .string()
    .trim()
    .refine((v) => !v || /^[A-Za-z]{2}$/.test(v), "Use a sigla, por exemplo SP."),
  emergency_name: z.string().trim(),
  emergency_phone: z.string().refine((v) => !onlyDigits(v) || isValidPhone(v), "Confira o telefone com DDD."),
  emergency_relation: z.string().trim(),
  goals_notes: z.string().trim(),
  height: z.string().refine((v) => {
    if (!v.trim()) return true
    const cm = parseHeightCm(v)
    return !!cm && cm >= 100 && cm <= 250
  }, "Digite a altura em metros (1,70) ou centímetros (170)."),
})

export type StudentEditInput = z.input<typeof editSchema>

export async function updateStudent(studentId: string, input: StudentEditInput): Promise<ActionResult> {
  await requireStaff()
  const parsed = editSchema.safeParse(input)
  if (!parsed.success) {
    return fail("Confira os campos marcados.", fieldErrors(parsed.error))
  }
  const d = parsed.data
  const empty = (v: string) => (v ? v : null)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("students")
    .update({
      full_name: d.full_name.replace(/\s+/g, " "),
      whatsapp: onlyDigits(d.whatsapp),
      email: empty(d.email.toLowerCase()),
      cep: empty(onlyDigits(d.cep)),
      street: empty(d.street),
      number: empty(d.number),
      complement: empty(d.complement),
      neighborhood: empty(d.neighborhood),
      city: empty(d.city),
      state: empty(d.state.toUpperCase()),
      emergency_name: empty(d.emergency_name),
      emergency_phone: empty(onlyDigits(d.emergency_phone)),
      emergency_relation: empty(d.emergency_relation),
      goals_notes: empty(d.goals_notes),
      height_cm: d.height.trim() ? parseHeightCm(d.height) : null,
    })
    .eq("id", studentId)
    .select("id")
  if (error) return fail(dbMessage(error, "Não foi possível salvar agora. Tente de novo."))
  if (!data?.length) return fail("Você não tem permissão para editar este aluno.")
  refresh(studentId)
  return { ok: true, data: undefined }
}
