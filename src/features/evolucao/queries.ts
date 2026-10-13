import "server-only"

import { createClient } from "@/lib/supabase/server"

import type { MeasurementPoint } from "./lib"

/** Todas as medições do aluno, da mais antiga para a mais nova (o RLS decide quem vê). */
export async function getMeasurements(studentId: string): Promise<MeasurementPoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("measurements")
    .select("id, measured_at, weight_kg, waist_cm, abdomen_cm, bmi, notes, source, created_by, author:profiles!measurements_created_by_fkey(full_name)")
    .eq("student_id", studentId)
    .order("measured_at")
  if (error) throw error
  return (data ?? []).map((m) => ({
    id: m.id,
    measured_at: m.measured_at,
    weight_kg: m.weight_kg,
    waist_cm: m.waist_cm,
    abdomen_cm: m.abdomen_cm,
    bmi: m.bmi,
    notes: m.notes,
    source: m.source,
    created_by_name: m.author?.full_name ?? null,
  }))
}

export type AttendanceRow = {
  id: string
  date: string
  start_time: string
  kind: "fixo" | "reposicao"
  status: "previsto" | "presente" | "falta" | "falta_justificada"
  session_status: "normal" | "cancelada" | "feriado"
}

/** Presenças do aluno (aulas normais) para a frequência. */
export async function getAttendance(studentId: string, sinceISO: string): Promise<AttendanceRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attendances")
    .select("id, kind, status, class_sessions!inner(date, start_time, status)")
    .eq("student_id", studentId)
    .gte("class_sessions.date", sinceISO)
  if (error) throw error
  return (data ?? [])
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      status: a.status,
      date: a.class_sessions.date,
      start_time: a.class_sessions.start_time.slice(0, 5),
      session_status: a.class_sessions.status,
    }))
    .filter((a) => a.session_status === "normal")
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time))
}
