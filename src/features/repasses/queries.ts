import "server-only"

import { todaySP } from "@/lib/dates"
import type { Database } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

type Fn<N extends keyof Database["public"]["Functions"]> = Database["public"]["Functions"][N]["Returns"]

export type PayoutRow = Fn<"payout_report">[number]
export type PayoutLine = Fn<"payout_details">[number]
export type RankingRow = Fn<"teaching_ranking">[number]

export const monthStart = (iso = todaySP()) => `${iso.slice(0, 7)}-01`
export const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number) as [number, number]
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10)
}

/** Sem rotina agendada: fixa o selo do mês anterior quando alguém da equipe abre o app. */
export async function ensureMonthlyAwards() {
  const supabase = await createClient()
  const { error } = await supabase.rpc("ensure_monthly_awards")
  if (error) console.error("ensure_monthly_awards", error)
}

export async function getPayoutReport(month: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("payout_report", { p_month: month })
  if (error) throw error
  return data ?? []
}

export async function getPayoutDetails(month: string, personalIds: string[]) {
  const supabase = await createClient()
  const entries = await Promise.all(
    personalIds.map(async (id) => {
      const { data } = await supabase.rpc("payout_details", { p_month: month, p_personal_id: id })
      return [id, data ?? []] as const
    }),
  )
  return new Map(entries)
}

/** Só o total do próprio professor (nunca por aluno). */
export async function getMyPayout(month: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc("my_payout", { p_month: month })
  return data?.[0] ?? { total_cents: 0, bonus_cents: 0, paid_amount_cents: null, paid_on: null }
}

export async function getRanking(month: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc("teaching_ranking", { p_month: month })
  return data ?? []
}

export async function getAwards(personalId?: string) {
  const supabase = await createClient()
  let query = supabase.from("staff_awards").select("id, personal_id, month, kind, classes, profiles(full_name)").order("month", { ascending: false })
  if (personalId) query = query.eq("personal_id", personalId)
  const { data } = await query
  return data ?? []
}

/** % vigente de cada professor e a próxima mudança já agendada (admin). */
export async function getCurrentRates() {
  const supabase = await createClient()
  const today = todaySP()
  const { data } = await supabase.from("staff_commission_rates").select("personal_id, rate_bp, valid_from").order("valid_from", { ascending: false })
  const map = new Map<string, { rate_bp: number; valid_from: string | null; next?: { rate_bp: number; valid_from: string } }>()
  for (const r of data ?? []) {
    const entry = map.get(r.personal_id) ?? { rate_bp: 0, valid_from: null }
    if (r.valid_from > today) entry.next = { rate_bp: r.rate_bp, valid_from: r.valid_from }
    else if (entry.valid_from === null) Object.assign(entry, { rate_bp: r.rate_bp, valid_from: r.valid_from })
    map.set(r.personal_id, entry)
  }
  return map
}
