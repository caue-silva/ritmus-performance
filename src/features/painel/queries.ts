import "server-only"

import { getDelinquents, getMonthlyReport } from "@/features/financeiro/queries"
import { todaySP } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"

export async function getDashboard() {
  const supabase = await createClient()
  const today = todaySP()
  const monthStart = `${today.slice(0, 7)}-01`
  const [students, slots, staff, attendance, months, delinquents] = await Promise.all([
    supabase.from("students").select("status, activated_at").is("anonymized_at", null),
    supabase.from("time_slot_occupancy").select("personal_id, capacity, taken").eq("active", true),
    supabase.from("profiles").select("id, full_name").eq("active", true),
    supabase
      .from("attendances")
      .select("status, class_sessions!inner(date, status)")
      .gte("class_sessions.date", monthStart)
      .lte("class_sessions.date", today)
      .eq("class_sessions.status", "normal"),
    getMonthlyReport(6),
    getDelinquents(),
  ])

  const all = students.data ?? []
  const active = all.filter((s) => s.status === "ativo").length
  const newThisMonth = all.filter((s) => s.status === "ativo" && s.activated_at && s.activated_at.slice(0, 10) >= monthStart).length

  const slotRows = slots.data ?? []
  const capacity = slotRows.reduce((n, s) => n + (s.capacity ?? 0), 0)
  const taken = slotRows.reduce((n, s) => n + (s.taken ?? 0), 0)
  const byPersonal = (staff.data ?? [])
    .map((p) => {
      const mine = slotRows.filter((s) => s.personal_id === p.id)
      const cap = mine.reduce((n, s) => n + (s.capacity ?? 0), 0)
      const tk = mine.reduce((n, s) => n + (s.taken ?? 0), 0)
      return { id: p.id, name: p.full_name, capacity: cap, taken: tk, slots: mine.length }
    })
    .filter((p) => p.capacity > 0)
    .sort((a, b) => b.taken / b.capacity - a.taken / a.capacity)

  const att = attendance.data ?? []
  const present = att.filter((a) => a.status === "presente").length
  const recorded = att.filter((a) => a.status !== "previsto").length

  const current = months.at(-1)!
  const overdueTotal = delinquents.reduce((n, d) => n + d.total_cents, 0)

  return {
    students: {
      active,
      newThisMonth,
      paused: all.filter((s) => s.status === "pausado").length,
      waiting: all.filter((s) => s.status === "aguardando" || s.status === "convidado").length,
    },
    occupancy: { capacity, taken, rate: capacity ? Math.round((taken / capacity) * 100) : 0, byPersonal },
    attendance: { present, recorded, rate: recorded ? Math.round((present / recorded) * 100) : null },
    revenue: { current, months },
    delinquency: { total: overdueTotal, students: delinquents.length },
  }
}
