"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth"
import { todaySP } from "@/lib/dates"
import type { Enums } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import { parseBRDate } from "@/lib/validation"

type Result<T = undefined> = { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> }

const refresh = () => {
  revalidatePath("/financeiro", "layout")
  revalidatePath("/equipe")
  revalidatePath("/meu-mes")
  revalidatePath("/painel")
}

/** Novo % de comissão, valendo a partir de uma data (meses anteriores não mudam). */
export async function setCommissionRate(personalId: string, percent: number, validFromBR: string): Promise<Result> {
  const admin = await requireAdmin()
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return { ok: false, message: "Use um percentual entre 0 e 100.", fieldErrors: { percent: "Use um percentual entre 0 e 100." } }
  }
  const validFrom = parseBRDate(validFromBR)
  if (!validFrom) return { ok: false, message: "Use o formato dd/mm/aaaa.", fieldErrors: { validFrom: "Use o formato dd/mm/aaaa." } }
  const supabase = await createClient()
  const { error } = await supabase
    .from("staff_commission_rates")
    .upsert({ personal_id: personalId, rate_bp: Math.round(percent * 100), valid_from: validFrom, created_by: admin.id }, { onConflict: "personal_id,valid_from" })
  if (error) return { ok: false, message: "Não deu para salvar a comissão agora." }
  refresh()
  return { ok: true, data: undefined }
}

export async function setJoinsRanking(personalId: string, joins: boolean): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ joins_ranking: joins }).eq("id", personalId)
  if (error) return { ok: false, message: "Não deu para salvar agora." }
  refresh()
  return { ok: true, data: undefined }
}

/** Marca o repasse do mês como pago (guarda o valor do momento). */
export async function markPayoutPaid(
  personalId: string,
  month: string,
  input: { amountCents: number; paidOn: string; method: Enums<"payment_method">; note: string },
): Promise<Result> {
  const admin = await requireAdmin()
  const paidOn = parseBRDate(input.paidOn)
  if (!paidOn) return { ok: false, message: "Use o formato dd/mm/aaaa.", fieldErrors: { paidOn: "Use o formato dd/mm/aaaa." } }
  if (paidOn > todaySP()) return { ok: false, message: "A data não pode ser no futuro.", fieldErrors: { paidOn: "A data não pode ser no futuro." } }
  if (!Number.isInteger(input.amountCents) || input.amountCents < 0) return { ok: false, message: "Valor inválido.", fieldErrors: { amount: "Valor inválido." } }
  const supabase = await createClient()
  const { error } = await supabase.from("staff_payouts").upsert(
    {
      personal_id: personalId,
      month,
      amount_cents: input.amountCents,
      paid_on: paidOn,
      payment_method: input.method,
      note: input.note.trim() || null,
      created_by: admin.id,
    },
    { onConflict: "personal_id,month" },
  )
  if (error) return { ok: false, message: "Não deu para registrar o repasse agora." }
  refresh()
  return { ok: true, data: undefined }
}

export async function undoPayout(personalId: string, month: string): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("staff_payouts").delete().eq("personal_id", personalId).eq("month", month)
  if (error) return { ok: false, message: "Não deu para desfazer." }
  refresh()
  return { ok: true, data: undefined }
}

/** Quem trouxe o aluno (bônus de indicação). */
export async function setReferredBy(studentId: string, personalId: string | null): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("students").update({ referred_by: personalId }).eq("id", studentId)
  if (error) return { ok: false, message: "Não deu para salvar agora." }
  revalidatePath(`/alunos/${studentId}`)
  refresh()
  return { ok: true, data: undefined }
}
