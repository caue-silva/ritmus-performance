"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { fieldErrors } from "@/lib/form-errors"

import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateTempPassword } from "@/lib/tokens"
import { isValidPhone, onlyDigits } from "@/lib/validation"

type Result<T = undefined> = { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> }

const createSchema = z.object({
  full_name: z
    .string()
    .trim()
    .refine((v) => v.split(/\s+/).length >= 2, "Digite nome e sobrenome."),
  email: z.email("Digite um e-mail válido."),
  whatsapp: z.string().refine((v) => !onlyDigits(v) || isValidPhone(v), "Confira o WhatsApp com DDD."),
  password: z.string().min(8, "A senha temporária precisa de pelo menos 8 caracteres."),
})

/** Cria a conta do personal (no servidor, com a chave secreta). Ele troca a senha no primeiro acesso. */
export async function createStaff(input: z.input<typeof createSchema>): Promise<Result<{ id: string }>> {
  await requireAdmin()
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }
  const d = parsed.data
  const db = createAdminClient()
  const email = d.email.trim().toLowerCase()
  const { data, error } = await db.auth.admin.createUser({ email, password: d.password, email_confirm: true })
  if (error) {
    const exists = error.code === "email_exists" || /already/i.test(error.message)
    return {
      ok: false,
      message: exists ? "Já existe uma conta com esse e-mail." : "Não foi possível criar a conta agora.",
      fieldErrors: exists ? { email: "Já existe uma conta com esse e-mail." } : undefined,
    }
  }
  const { error: pErr } = await db.from("profiles").insert({
    id: data.user.id,
    email,
    full_name: d.full_name.replace(/\s+/g, " "),
    whatsapp: onlyDigits(d.whatsapp) || null,
    role: "personal",
    must_change_password: true,
  })
  if (pErr) {
    await db.auth.admin.deleteUser(data.user.id)
    console.error(pErr)
    return { ok: false, message: "Não foi possível criar a conta agora." }
  }
  revalidatePath("/equipe")
  return { ok: true, data: { id: data.user.id } }
}

/** Nova senha temporária (o personal esqueceu a senha). Ele troca no próximo acesso. */
export async function resetStaffPassword(staffId: string): Promise<Result<{ password: string }>> {
  const admin = await requireAdmin()
  if (staffId === admin.id) return { ok: false, message: "Para trocar a sua senha, use Minha conta." }
  const db = createAdminClient()
  const password = generateTempPassword()
  const { error } = await db.auth.admin.updateUserById(staffId, { password })
  if (error) return { ok: false, message: "Não foi possível redefinir a senha agora." }
  await db.from("profiles").update({ must_change_password: true }).eq("id", staffId)
  revalidatePath("/equipe")
  return { ok: true, data: { password } }
}

/** Ativa/desativa: desativado não entra no app e perde o acesso aos dados na hora (RLS). */
export async function setStaffActive(staffId: string, active: boolean): Promise<Result> {
  const admin = await requireAdmin()
  if (staffId === admin.id) return { ok: false, message: "Você não pode desativar a sua própria conta." }
  const db = createAdminClient()
  const { error } = await db.from("profiles").update({ active }).eq("id", staffId)
  if (error) return { ok: false, message: "Não foi possível mudar o acesso agora." }
  // Bloqueia também o login (e encerra a renovação da sessão).
  await db.auth.admin.updateUserById(staffId, { ban_duration: active ? "none" : "876000h" })
  revalidatePath("/equipe")
  return { ok: true, data: undefined }
}

const editSchema = z.object({
  full_name: z
    .string()
    .trim()
    .refine((v) => v.split(/\s+/).length >= 2, "Digite nome e sobrenome."),
  whatsapp: z.string().refine((v) => !onlyDigits(v) || isValidPhone(v), "Confira o WhatsApp com DDD."),
})

export async function updateStaff(staffId: string, input: z.input<typeof editSchema>): Promise<Result> {
  await requireAdmin()
  const parsed = editSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos.",
      fieldErrors: fieldErrors(parsed.error),
    }
  }
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ full_name: parsed.data.full_name.replace(/\s+/g, " "), whatsapp: onlyDigits(parsed.data.whatsapp) || null })
    .eq("id", staffId)
  if (error) return { ok: false, message: "Não foi possível salvar agora." }
  revalidatePath("/equipe")
  return { ok: true, data: undefined }
}

export async function suggestTempPassword() {
  await requireAdmin()
  return generateTempPassword()
}
