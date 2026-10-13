"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { normalizePixKey, type PixKeyKind } from "@/integrations/payments/pix"
import { requireAdmin } from "@/lib/auth"
import { todaySP } from "@/lib/dates"
import { fieldErrors } from "@/lib/form-errors"
import type { Enums } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import { parseBRDate } from "@/lib/validation"

type Result<T = undefined> = { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> }

const refresh = (chargeId?: string) => {
  revalidatePath("/financeiro", "layout")
  revalidatePath("/tarefas")
  if (chargeId) revalidatePath(`/financeiro/${chargeId}`)
}

const METHODS = ["pix", "dinheiro", "cartao", "outro"] as const

const confirmSchema = z.object({
  paidOn: z.string().refine((v) => !!parseBRDate(v), "Use o formato dd/mm/aaaa."),
  method: z.enum(METHODS, { message: "Escolha a forma de pagamento." }),
  note: z.string().trim().max(200),
})

/** Confirmação manual do pagamento (Pix, dinheiro, maquininha…). */
export async function confirmPayment(
  chargeId: string,
  input: z.input<typeof confirmSchema>,
): Promise<Result<{ amountCents: number; name: string }>> {
  await requireAdmin()
  const parsed = confirmSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Confira os campos.", fieldErrors: fieldErrors(parsed.error) }
  const paidOn = parseBRDate(parsed.data.paidOn)!
  if (paidOn > todaySP()) return { ok: false, message: "A data não pode ser no futuro.", fieldErrors: { paidOn: "A data não pode ser no futuro." } }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("charges")
    .update({ status: "pago", paid_on: paidOn, payment_method: parsed.data.method, payment_note: parsed.data.note || null })
    .eq("id", chargeId)
    .eq("status", "pendente")
    .select("amount_cents, students(full_name)")
  if (error) return { ok: false, message: "Não deu para confirmar agora. Tente de novo." }
  if (!data?.length) return { ok: false, message: "Esta mensalidade já não está pendente. Atualize a tela." }
  refresh(chargeId)
  return { ok: true, data: { amountCents: data[0]!.amount_cents, name: data[0]!.students?.full_name ?? "" } }
}

/** Desfazer a confirmação (volta a pendente). */
export async function undoPayment(chargeId: string): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("charges").update({ status: "pendente", payment_note: null }).eq("id", chargeId).eq("status", "pago")
  if (error) return { ok: false, message: "Não deu para desfazer." }
  refresh(chargeId)
  return { ok: true, data: undefined }
}

/** Ajustar valor e/ou vencimento de UMA mensalidade (fica no histórico quem alterou). */
export async function adjustCharge(chargeId: string, input: { amountCents: number; dueDate: string }): Promise<Result> {
  await requireAdmin()
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { ok: false, message: "Digite um valor maior que zero.", fieldErrors: { amount: "Digite um valor maior que zero." } }
  }
  const due = parseBRDate(input.dueDate)
  if (!due) return { ok: false, message: "Use o formato dd/mm/aaaa.", fieldErrors: { due: "Use o formato dd/mm/aaaa." } }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("charges")
    .update({ amount_cents: input.amountCents, due_date: due })
    .eq("id", chargeId)
    .eq("status", "pendente")
    .select("id")
  if (error) return { ok: false, message: "Não deu para salvar agora." }
  if (!data?.length) return { ok: false, message: "Só dá para ajustar mensalidade pendente." }
  refresh(chargeId)
  return { ok: true, data: undefined }
}

export async function cancelCharge(chargeId: string, reason: string): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("charges")
    .update({ status: "cancelado", canceled_reason: reason.trim() || null })
    .eq("id", chargeId)
    .eq("status", "pendente")
    .select("id")
  if (error || !data?.length) return { ok: false, message: "Só dá para cancelar mensalidade pendente." }
  refresh(chargeId)
  return { ok: true, data: undefined }
}

export async function reopenCharge(chargeId: string): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("charges").update({ status: "pendente", canceled_reason: null }).eq("id", chargeId).eq("status", "cancelado")
  if (error) return { ok: false, message: "Não deu para reabrir." }
  refresh(chargeId)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Configurações: Pix e mensagens
// ---------------------------------------------------------------------------
const KEY_TYPES = ["cpf", "cnpj", "telefone", "email", "aleatoria"] as const

export async function savePixSettings(input: { keyType: string; key: string; receiverName: string; city: string }): Promise<Result> {
  const admin = await requireAdmin()
  const errors: Record<string, string> = {}
  if (!KEY_TYPES.includes(input.keyType as PixKeyKind)) errors.keyType = "Escolha o tipo da chave."
  const normalized = errors.keyType ? null : normalizePixKey(input.key, input.keyType as PixKeyKind)
  if (!errors.keyType && !normalized) errors.key = "Essa chave não parece certa para o tipo escolhido."
  if (input.receiverName.trim().length < 3) errors.receiverName = "Digite o nome que aparece no Pix (titular da conta)."
  if (input.city.trim().length < 2) errors.city = "Digite a cidade."
  if (Object.keys(errors).length) return { ok: false, message: "Confira os campos.", fieldErrors: errors }
  const supabase = await createClient()
  const { error } = await supabase
    .from("studio_settings")
    .update({
      pix_key: normalized!.key,
      pix_key_type: normalized!.kind,
      pix_receiver_name: input.receiverName.trim(),
      pix_city: input.city.trim(),
      updated_by: admin.id,
    })
    .eq("id", true)
  if (error) return { ok: false, message: "Não deu para salvar agora." }
  revalidatePath("/configuracoes")
  refresh()
  return { ok: true, data: undefined }
}

export async function saveChargeMessages(input: { msg_due_today: string; msg_overdue: string; msg_reminder: string }): Promise<Result> {
  const admin = await requireAdmin()
  const errors: Record<string, string> = {}
  for (const [k, v] of Object.entries(input)) {
    if (v.trim().length < 10) errors[k] = "A mensagem ficou muito curta."
    else if (!v.includes("{valor}")) errors[k] = "Inclua {valor} para o aluno saber quanto pagar."
  }
  if (Object.keys(errors).length) return { ok: false, message: "Confira as mensagens.", fieldErrors: errors }
  const supabase = await createClient()
  const { error } = await supabase
    .from("studio_settings")
    .update({ msg_due_today: input.msg_due_today.trim(), msg_overdue: input.msg_overdue.trim(), msg_reminder: input.msg_reminder.trim(), updated_by: admin.id })
    .eq("id", true)
  if (error) return { ok: false, message: "Não deu para salvar agora." }
  revalidatePath("/configuracoes")
  refresh()
  return { ok: true, data: undefined }
}

export type PaymentMethod = Enums<"payment_method">
