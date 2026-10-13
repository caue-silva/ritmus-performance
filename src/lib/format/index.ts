import type { Enums } from "@/lib/supabase/database.types"

export const TIME_ZONE = "America/Sao_Paulo"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
/** 12345 → "R$ 123,45" */
export const formatBRL = (cents: number) => brl.format(cents / 100)

const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" })
/** Data em dd/mm/aaaa. Aceita "2026-10-12" (data pura) ou Date/ISO com hora. */
export function formatDate(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-")
    return `${d}/${m}/${y}`
  }
  return dateFmt.format(new Date(value))
}

/** "15991234567" → "(15) 99123-4567" */
export function formatPhone(digits: string | null | undefined) {
  const d = (digits ?? "").replace(/\D/g, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

/** "12345678901" → "123.456.789-01" */
export function formatCPF(digits: string | null | undefined) {
  const d = (digits ?? "").replace(/\D/g, "")
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d
}

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName

export const initials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")

export const STUDENT_STATUS_LABEL: Record<Enums<"student_status">, string> = {
  convidado: "Link enviado",
  aguardando: "Aguardando ativação",
  ativo: "Ativo",
  pausado: "Pausado",
  inativo: "Inativo",
}

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const
export const WEEKDAY_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const

/** "07:00:00" → "7h"; "07:30:00" → "7h30" */
export function formatHour(time: string) {
  const [h, m] = time.split(":")
  return `${Number(h)}h${m && m !== "00" ? m : ""}`
}

/** Dias da semana em texto curto: [1,2,3,4,5] → "Seg a Sex"; [1,3,5] → "Seg, Qua e Sex" */
export function formatWeekdays(days: number[]) {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  const contiguous = sorted.length >= 3 && sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1)
  if (contiguous) return `${WEEKDAY_SHORT[sorted[0]!]} a ${WEEKDAY_SHORT[sorted.at(-1)!]}`
  return joinPt(sorted.map((d) => WEEKDAY_SHORT[d]!))
}

const joinPt = (parts: string[]) => (parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}` : (parts[0] ?? ""))

/**
 * Resume horários fixos agrupando os dias iguais:
 * seg–sex às 6h e 7h + sáb às 8h → "Seg a Sex às 6h e 7h · Sáb às 8h"
 */
export function summarizeSchedule(items: { weekday: number; start_time: string }[]) {
  if (!items.length) return "Sem horários fixos"
  const daysByTime = new Map<string, number[]>()
  for (const i of items) daysByTime.set(i.start_time, [...(daysByTime.get(i.start_time) ?? []), i.weekday])
  // Junta os horários que acontecem exatamente nos mesmos dias.
  const timesByDays = new Map<string, { days: number[]; times: string[] }>()
  for (const [time, days] of [...daysByTime.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const key = [...new Set(days)].sort().join(",")
    const group = timesByDays.get(key) ?? { days, times: [] }
    group.times.push(time)
    timesByDays.set(key, group)
  }
  return [...timesByDays.values()]
    .sort((a, b) => Math.min(...a.days) - Math.min(...b.days) || b.days.length - a.days.length)
    .map((g) => `${formatWeekdays(g.days)} às ${joinPt(g.times.map(formatHour))}`)
    .join(" · ")
}
