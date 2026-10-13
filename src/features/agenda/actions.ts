"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin, requireStaff } from "@/lib/auth"
import { isISODate, todaySP } from "@/lib/dates"
import type { Enums } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

type Result<T = undefined> = { ok: true; data: T } | { ok: false; message: string }

const dbMessage = (error: { message: string; code?: string }, fallback: string) => {
  if (error.code === "P0001" || error.code === "42501") return error.message
  console.error(error)
  return fallback
}

const refresh = () => {
  revalidatePath("/agora")
  revalidatePath("/agenda", "layout")
  revalidatePath("/tarefas")
}

// ---------------------------------------------------------------------------
// Presença
// ---------------------------------------------------------------------------
export async function setAttendanceStatus(
  attendanceId: string,
  status: Enums<"attendance_status">,
): Promise<Result<{ previous: Enums<"attendance_status"> }>> {
  await requireStaff()
  const supabase = await createClient()
  const { data: before } = await supabase.from("attendances").select("status").eq("id", attendanceId).maybeSingle()
  if (!before) return { ok: false, message: "Não encontramos esse aluno na aula. Atualize a tela." }
  const { data, error } = await supabase.from("attendances").update({ status }).eq("id", attendanceId).select("id")
  if (error) return { ok: false, message: dbMessage(error, "Não deu para salvar a presença. Tente de novo.") }
  if (!data?.length) return { ok: false, message: "Só o personal desta aula marca a presença." }
  refresh()
  return { ok: true, data: { previous: before.status } }
}

export async function addMakeup(sessionId: string, studentId: string): Promise<Result<{ attendanceId: string }>> {
  const staff = await requireStaff()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attendances")
    .insert({ session_id: sessionId, student_id: studentId, kind: "reposicao", status: "previsto", created_by: staff.id })
    .select("id")
    .single()
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Esse aluno já está nesta aula." }
    if (error.code === "42501") return { ok: false, message: "Só o dono do horário registra reposição nele." }
    return { ok: false, message: dbMessage(error, "Não deu para registrar a reposição. Tente de novo.") }
  }
  refresh()
  return { ok: true, data: { attendanceId: data.id } }
}

export async function removeMakeup(attendanceId: string): Promise<Result> {
  await requireStaff()
  const supabase = await createClient()
  const { data, error } = await supabase.from("attendances").delete().eq("id", attendanceId).eq("kind", "reposicao").select("id")
  if (error || !data?.length) return { ok: false, message: "Não deu para remover a reposição." }
  refresh()
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Aula: cancelar / reabrir (personal na própria aula; admin em qualquer uma)
// ---------------------------------------------------------------------------
export async function setSessionCanceled(sessionId: string, canceled: boolean, reason?: string): Promise<Result> {
  await requireStaff()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("class_sessions")
    .update({ status: canceled ? "cancelada" : "normal", status_reason: canceled ? reason?.trim() || null : null })
    .eq("id", sessionId)
    .select("id, date")
  if (error) return { ok: false, message: dbMessage(error, "Não deu para mudar a aula agora.") }
  if (!data?.length) return { ok: false, message: "Só o personal desta aula pode cancelar." }
  // Ao reabrir, garante que os alunos fixos estão na lista.
  if (!canceled) await supabase.rpc("ensure_sessions", { p_from: data[0]!.date, p_to: data[0]!.date })
  refresh()
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Configuração (admin): funcionamento, duração, horários fixos e feriados
// ---------------------------------------------------------------------------
export async function saveBusinessHours(
  days: { weekday: number; open: boolean; opens_at: string; closes_at: string }[],
  durationMin: number,
): Promise<Result> {
  await requireAdmin()
  if (!Number.isInteger(durationMin) || durationMin < 15 || durationMin > 180) {
    return { ok: false, message: "A duração da aula fica entre 15 e 180 minutos." }
  }
  for (const d of days) {
    if (d.open && !(d.opens_at < d.closes_at)) return { ok: false, message: "O horário de fechar precisa ser depois do de abrir." }
  }
  const supabase = await createClient()
  const closed = days.filter((d) => !d.open).map((d) => d.weekday)
  const open = days.filter((d) => d.open).map(({ weekday, opens_at, closes_at }) => ({ weekday, opens_at, closes_at }))
  if (closed.length) await supabase.from("business_hours").delete().in("weekday", closed)
  if (open.length) {
    const { error } = await supabase.from("business_hours").upsert(open)
    if (error) return { ok: false, message: dbMessage(error, "Não deu para salvar o funcionamento.") }
  }
  const { error } = await supabase.from("agenda_settings").update({ class_duration_min: durationMin }).eq("id", true)
  if (error) return { ok: false, message: dbMessage(error, "Não deu para salvar a duração.") }
  revalidatePath("/configuracoes/horarios")
  return { ok: true, data: undefined }
}

/** Define quem dá aula num horário fixo (ou remove o horário com personalId = null). */
export async function setSlotPersonal(weekday: number, startTime: string, personalId: string | null): Promise<Result> {
  await requireAdmin()
  if (weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}$/.test(startTime)) return { ok: false, message: "Horário inválido." }
  const supabase = await createClient()
  const { data: slot } = await supabase
    .from("time_slots")
    .select("id")
    .eq("weekday", weekday)
    .eq("start_time", startTime)
    .eq("active", true)
    .maybeSingle()

  if (personalId) {
    const { error } = slot
      ? await supabase.from("time_slots").update({ personal_id: personalId }).eq("id", slot.id)
      : await supabase.from("time_slots").insert({ weekday, start_time: startTime, personal_id: personalId })
    if (error) return { ok: false, message: dbMessage(error, "Não deu para salvar o horário.") }
  } else if (slot) {
    const today = todaySP()
    const { count: fixed } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("time_slot_id", slot.id)
      .or(`ends_on.is.null,ends_on.gt.${today}`)
    if (fixed) {
      return {
        ok: false,
        message: `Este horário tem ${fixed} ${fixed === 1 ? "aluno fixo" : "alunos fixos"}. Troque os horários deles na ficha antes de remover.`,
      }
    }
    const { data: future } = await supabase.from("class_sessions").select("id").eq("time_slot_id", slot.id).gte("date", today)
    const ids = (future ?? []).map((s) => s.id)
    if (ids.length) {
      const { count: makeups } = await supabase
        .from("attendances")
        .select("id", { count: "exact", head: true })
        .in("session_id", ids)
        .eq("kind", "reposicao")
      if (makeups) return { ok: false, message: "Há reposições marcadas neste horário. Remova-as antes." }
      await supabase.from("class_sessions").delete().in("id", ids)
    }
    const { error } = await supabase.from("time_slots").update({ active: false }).eq("id", slot.id)
    if (error) return { ok: false, message: dbMessage(error, "Não deu para remover o horário.") }
  }
  revalidatePath("/configuracoes/horarios")
  revalidatePath("/equipe")
  refresh()
  return { ok: true, data: undefined }
}

export async function addClosure(date: string, reason: string): Promise<Result> {
  await requireAdmin()
  if (!isISODate(date)) return { ok: false, message: "Escolha a data." }
  const supabase = await createClient()
  const { error } = await supabase.from("closures").insert({ date, reason: reason.trim() || "Feriado" })
  if (error) return { ok: false, message: error.code === "23505" ? "Essa data já está marcada." : "Não deu para salvar o feriado." }
  revalidatePath("/configuracoes/horarios")
  refresh()
  return { ok: true, data: undefined }
}

export async function removeClosure(date: string): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("closures").delete().eq("date", date)
  if (error) return { ok: false, message: "Não deu para remover o feriado." }
  revalidatePath("/configuracoes/horarios")
  refresh()
  return { ok: true, data: undefined }
}
