import "server-only"

import { pixReady, staticPixProvider, type PixSettings } from "@/integrations/payments"
import { todaySP } from "@/lib/dates"
import type { Database } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import { whatsappLink } from "@/lib/whatsapp"

import { chargeMessage, type EffectiveStatus, type MessageTemplates } from "./lib"

export type ChargeRow = {
  id: string
  student_id: string
  full_name: string
  whatsapp: string
  competence: string
  amount_cents: number
  due_date: string
  status: Database["public"]["Enums"]["charge_status"]
  effective_status: EffectiveStatus
  days_overdue: number
  paid_on: string | null
  payment_method: Database["public"]["Enums"]["payment_method"] | null
  payment_note: string | null
  canceled_reason: string | null
  /** Pix copia e cola (null se a chave Pix não estiver configurada). */
  pix: string | null
  /** Link do WhatsApp com a mensagem pronta (atraso / vence hoje / lembrete). */
  whatsapp_url: string
}

export type FinanceSettings = PixSettings & MessageTemplates & { studio_name: string }

/** Garante as mensalidades do mês (idempotente). Chamado quando o admin abre o app. */
export async function ensureMonthlyCharges() {
  const supabase = await createClient()
  const { error } = await supabase.rpc("ensure_monthly_charges")
  if (error) console.error("ensure_monthly_charges", error)
}

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("studio_settings")
    .select("studio_name, pix_key, pix_key_type, pix_receiver_name, pix_city, msg_due_today, msg_overdue, msg_reminder")
    .single()
  if (error) throw error
  return data
}

type ViewRow = Database["public"]["Views"]["charges_view"]["Row"]

/** Completa a linha com Pix e link do WhatsApp. */
export function decorate(rows: ViewRow[], settings: FinanceSettings, today = todaySP()): ChargeRow[] {
  const provider = pixReady(settings) ? staticPixProvider(settings) : null
  return rows.map((r) => {
    let pix: string | null = null
    if (provider && (r.status === "pendente")) {
      try {
        pix = provider.issue({ chargeId: r.id!, amountCents: r.amount_cents! }).copyPaste
      } catch {
        pix = null
      }
    }
    const base = { full_name: r.full_name!, amount_cents: r.amount_cents!, due_date: r.due_date! }
    return {
      id: r.id!,
      student_id: r.student_id!,
      full_name: r.full_name!,
      whatsapp: r.whatsapp!,
      competence: r.competence!,
      amount_cents: r.amount_cents!,
      due_date: r.due_date!,
      status: r.status!,
      effective_status: r.effective_status as EffectiveStatus,
      days_overdue: r.days_overdue ?? 0,
      paid_on: r.paid_on,
      payment_method: r.payment_method,
      payment_note: r.payment_note,
      canceled_reason: r.canceled_reason,
      pix,
      whatsapp_url: whatsappLink(r.whatsapp!, chargeMessage(settings, base, pix, today)),
    }
  })
}

export async function getChargesByMonth(competence: string): Promise<ChargeRow[]> {
  const supabase = await createClient()
  const [settings, { data, error }] = await Promise.all([
    getFinanceSettings(),
    supabase.from("charges_view").select("*").eq("competence", competence).order("due_date").order("full_name"),
  ])
  if (error) throw error
  return decorate(data ?? [], settings)
}

export async function getChargesByIds(ids: string[]): Promise<Map<string, ChargeRow>> {
  if (!ids.length) return new Map()
  const supabase = await createClient()
  const [settings, { data }] = await Promise.all([getFinanceSettings(), supabase.from("charges_view").select("*").in("id", ids)])
  return new Map(decorate(data ?? [], settings).map((c) => [c.id, c]))
}

export async function getCharge(id: string) {
  const supabase = await createClient()
  const [settings, { data }, { data: events }] = await Promise.all([
    getFinanceSettings(),
    supabase.from("charges_view").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("charge_events")
      .select("id, action, old_value, new_value, at, actor:profiles(full_name)")
      .eq("charge_id", id)
      .order("at", { ascending: false }),
  ])
  if (!data) return null
  return { charge: decorate([data], settings)[0]!, events: events ?? [], settings }
}

export async function getStudentCharges(studentId: string): Promise<ChargeRow[]> {
  const supabase = await createClient()
  const [settings, { data }] = await Promise.all([
    getFinanceSettings(),
    supabase.from("charges_view").select("*").eq("student_id", studentId).order("competence", { ascending: false }).limit(6),
  ])
  return decorate(data ?? [], settings)
}

export type MonthReport = { competence: string; expected: number; received: number; open: number; overdue: number; count: number }

/** Recebido × previsto por mês (pela competência da mensalidade). */
export async function getMonthlyReport(months = 6): Promise<MonthReport[]> {
  const supabase = await createClient()
  const today = todaySP()
  const [y, m] = today.split("-").map(Number) as [number, number]
  const from = new Date(Date.UTC(y, m - months, 1)).toISOString().slice(0, 10)
  const { data } = await supabase
    .from("charges_view")
    .select("competence, amount_cents, status, effective_status")
    .gte("competence", from)
  const out: MonthReport[] = []
  for (let i = months - 1; i >= 0; i--) {
    const competence = new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 10)
    const rows = (data ?? []).filter((r) => r.competence === competence && r.status !== "cancelado")
    out.push({
      competence,
      expected: rows.reduce((n, r) => n + r.amount_cents!, 0),
      received: rows.filter((r) => r.status === "pago").reduce((n, r) => n + r.amount_cents!, 0),
      open: rows.filter((r) => r.effective_status === "pendente").reduce((n, r) => n + r.amount_cents!, 0),
      overdue: rows.filter((r) => r.effective_status === "vencido").reduce((n, r) => n + r.amount_cents!, 0),
      count: rows.length,
    })
  }
  return out
}

export type Delinquent = { student_id: string; full_name: string; total_cents: number; charges: ChargeRow[]; oldest_due: string; max_days: number }

/** Inadimplentes: alunos com mensalidade vencida e não paga. */
export async function getDelinquents(): Promise<Delinquent[]> {
  const supabase = await createClient()
  const [settings, { data }] = await Promise.all([
    getFinanceSettings(),
    supabase.from("charges_view").select("*").eq("effective_status", "vencido").order("due_date"),
  ])
  const rows = decorate(data ?? [], settings)
  const map = new Map<string, Delinquent>()
  for (const r of rows) {
    const d = map.get(r.student_id) ?? { student_id: r.student_id, full_name: r.full_name, total_cents: 0, charges: [], oldest_due: r.due_date, max_days: 0 }
    d.total_cents += r.amount_cents
    d.charges.push(r)
    d.oldest_due = d.oldest_due < r.due_date ? d.oldest_due : r.due_date
    d.max_days = Math.max(d.max_days, r.days_overdue)
    map.set(r.student_id, d)
  }
  return [...map.values()].sort((a, b) => b.max_days - a.max_days)
}
