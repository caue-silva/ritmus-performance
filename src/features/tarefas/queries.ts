import "server-only"

import type { ChargeActionTarget } from "@/features/financeiro/components/charge-actions"
import { getChargesByIds } from "@/features/financeiro/queries"
import { createClient } from "@/lib/supabase/server"

export type TaskKind = "atrasado" | "vence_hoje" | "liberacao" | "cadastro" | "valor"

export type Task = {
  key: string
  kind: TaskKind
  studentId: string
  name: string
  whatsapp: string
  chargeId: string | null
  amountCents: number | null
  refDate: string | null
  // Dados para as ações no próprio card
  personalId: string | null
  weeklyFrequency: number | null
  feeCents: number | null
  dueDay: number | null
  /** Tarefas de cobrança: dados para "Cobrar no WhatsApp" e "Confirmar pagamento". */
  charge: ChargeActionTarget | null
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient()
  const { data: rows, error } = await supabase.from("admin_tasks").select("*")
  if (error) throw error
  const ids = [...new Set((rows ?? []).map((r) => r.student_id!))]
  const [students, billing] = ids.length
    ? await Promise.all([
        supabase.from("students").select("id, personal_id, weekly_frequency").in("id", ids),
        supabase.from("student_billing").select("student_id, monthly_fee_cents, due_day").in("student_id", ids),
      ])
    : [{ data: [] }, { data: [] }]
  const charges = await getChargesByIds((rows ?? []).map((r) => r.charge_id).filter((x): x is string => !!x))
  const sMap = new Map((students.data ?? []).map((s) => [s.id, s]))
  const bMap = new Map((billing.data ?? []).map((b) => [b.student_id, b]))

  return (rows ?? []).map((r) => ({
    key: `${r.kind}:${r.charge_id ?? r.student_id}`,
    kind: r.kind as TaskKind,
    studentId: r.student_id!,
    name: r.full_name!,
    whatsapp: r.whatsapp!,
    chargeId: r.charge_id,
    amountCents: r.amount_cents,
    refDate: r.ref_date,
    personalId: sMap.get(r.student_id!)?.personal_id ?? null,
    weeklyFrequency: sMap.get(r.student_id!)?.weekly_frequency ?? null,
    feeCents: bMap.get(r.student_id!)?.monthly_fee_cents ?? null,
    dueDay: bMap.get(r.student_id!)?.due_day ?? null,
    charge: r.charge_id ? (charges.get(r.charge_id) ?? null) : null,
  }))
}

export async function countOpenTasks(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase.from("admin_tasks").select("kind", { count: "exact", head: true })
  return count ?? 0
}
