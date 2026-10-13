import "server-only"

import { addDays, minutesOf, nowTimeSP, todaySP } from "@/lib/dates"
import type { Enums } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

export type SessionSummary = {
  id: string
  date: string
  start_time: string
  personal_id: string
  personal_name: string
  status: Enums<"session_status">
  status_reason: string | null
  capacity: number
  taken: number
  present: number
  makeups: number
}

export type RosterEntry = {
  attendance_id: string
  student_id: string
  full_name: string
  kind: Enums<"attendance_kind">
  status: Enums<"attendance_status">
  checked_in_at: string | null
  is_mine: boolean
  owner_name: string | null
  health_flag: boolean
  created_by_name: string | null
  created_at: string
  last_measured_at: string | null
}

export async function getClassDuration() {
  const supabase = await createClient()
  const { data } = await supabase.from("agenda_settings").select("class_duration_min").single()
  return data?.class_duration_min ?? 60
}

/** Garante que as aulas do período existem (idempotente) e devolve as aulas com vagas. */
export async function getSessions(from: string, to: string, personalId?: string): Promise<SessionSummary[]> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("ensure_sessions", { p_from: from, p_to: to })
  if (error) throw error
  let query = supabase
    .from("session_occupancy")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date")
    .order("start_time")
  if (personalId) query = query.eq("personal_id", personalId)
  const [{ data: rows, error: e2 }, { data: staff }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name"),
  ])
  if (e2) throw e2
  const names = new Map((staff ?? []).map((p) => [p.id, p.full_name]))
  return (rows ?? []).map((r) => ({
    id: r.session_id!,
    date: r.date!,
    start_time: r.start_time!.slice(0, 5),
    personal_id: r.personal_id!,
    personal_name: names.get(r.personal_id!) ?? "",
    status: r.status!,
    status_reason: r.status_reason,
    capacity: r.capacity ?? 4,
    taken: r.taken ?? 0,
    present: r.present ?? 0,
    makeups: r.makeups ?? 0,
  }))
}

export async function getSession(id: string): Promise<SessionSummary | null> {
  const supabase = await createClient()
  const [{ data: r }, { data: staff }] = await Promise.all([
    supabase.from("session_occupancy").select("*").eq("session_id", id).maybeSingle(),
    supabase.from("profiles").select("id, full_name"),
  ])
  if (!r) return null
  return {
    id: r.session_id!,
    date: r.date!,
    start_time: r.start_time!.slice(0, 5),
    personal_id: r.personal_id!,
    personal_name: staff?.find((p) => p.id === r.personal_id)?.full_name ?? "",
    status: r.status!,
    status_reason: r.status_reason,
    capacity: r.capacity ?? 4,
    taken: r.taken ?? 0,
    present: r.present ?? 0,
    makeups: r.makeups ?? 0,
  }
}

export async function getRoster(sessionId: string): Promise<RosterEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("session_roster", { p_session_id: sessionId })
  if (error) throw error
  return (data ?? []) as RosterEntry[]
}

export type NowState =
  | { kind: "agora" | "proxima"; session: SessionSummary; today: SessionSummary[]; duration: number }
  | { kind: "nenhuma"; next: SessionSummary | null; today: SessionSummary[]; duration: number }

/** Aula em andamento (ou a próxima) de um personal. */
export async function getNow(personalId: string): Promise<NowState> {
  const today = todaySP()
  const [sessions, duration] = await Promise.all([getSessions(today, addDays(today, 7), personalId), getClassDuration()])
  const now = minutesOf(nowTimeSP())
  const todays = sessions.filter((s) => s.date === today && s.status === "normal")
  const current = todays.find((s) => now >= minutesOf(s.start_time) && now < minutesOf(s.start_time) + duration)
  if (current) return { kind: "agora", session: current, today: todays, duration }
  const next = todays.find((s) => minutesOf(s.start_time) > now)
  if (next) return { kind: "proxima", session: next, today: todays, duration }
  return {
    kind: "nenhuma",
    next: sessions.find((s) => s.date > today && s.status === "normal") ?? null,
    today: todays,
    duration,
  }
}
