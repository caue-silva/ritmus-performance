import "server-only"

import { createClient } from "@/lib/supabase/server"

export type StaffOption = { id: string; full_name: string; role: "admin" | "personal" }
export type SlotOption = { id: string; weekday: number; start_time: string; personal_id: string; capacity: number; taken: number }
export type ActivationOptions = { staff: StaffOption[]; slots: SlotOption[]; referenceFees: Record<string, number> }

/** Opções do painel de ativação (somente admin). */
export async function getActivationOptions(): Promise<ActivationOptions> {
  const supabase = await createClient()
  const [staff, slots, settings] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").eq("active", true).order("role").order("full_name"),
    supabase
      .from("time_slot_occupancy")
      .select("time_slot_id, weekday, start_time, personal_id, capacity, taken")
      .eq("active", true)
      .order("weekday")
      .order("start_time"),
    supabase.from("studio_settings").select("reference_fees").single(),
  ])
  return {
    staff: staff.data ?? [],
    slots: (slots.data ?? []).map((s) => ({
      id: s.time_slot_id!,
      weekday: s.weekday!,
      start_time: s.start_time!,
      personal_id: s.personal_id!,
      capacity: s.capacity!,
      taken: s.taken ?? 0,
    })),
    referenceFees: (settings.data?.reference_fees as Record<string, number> | null) ?? {},
  }
}

export async function getStudentDetail(id: string, isAdmin: boolean) {
  const supabase = await createClient()
  const { data: student } = await supabase
    .from("students")
    .select(
      "*, personal:profiles!students_personal_id_fkey(full_name), student_health(*), enrollments(id, starts_on, ends_on, time_slots(weekday, start_time))",
    )
    .eq("id", id)
    .maybeSingle()
  if (!student) return null

  const [billing, measurements, invite] = await Promise.all([
    isAdmin ? supabase.from("student_billing").select("monthly_fee_cents, due_day").eq("student_id", id).maybeSingle() : null,
    supabase.from("measurements").select("weight_kg, measured_at, source").eq("student_id", id).order("measured_at").limit(1),
    isAdmin && student.status === "convidado"
      ? supabase.from("student_invites").select("expires_at, created_at").eq("student_id", id).is("used_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle()
      : null,
  ])

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
  return {
    student,
    health: student.student_health,
    billing: billing?.data ?? null,
    initialWeight: measurements.data?.[0]?.weight_kg ?? null,
    invite: invite?.data ?? null,
    enrollments: (student.enrollments ?? [])
      .filter((e) => !e.ends_on || e.ends_on > today)
      .map((e) => ({ id: e.id, weekday: e.time_slots!.weekday, start_time: e.time_slots!.start_time }))
      .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)),
  }
}
