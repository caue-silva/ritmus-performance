import { TIME_ZONE, WEEKDAY_SHORT } from "@/lib/format"

/** Data de hoje em São Paulo, em ISO (aaaa-mm-dd). */
export const todaySP = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: TIME_ZONE })

/** Hora atual em São Paulo, "HH:MM". */
export const nowTimeSP = (now = new Date()) =>
  now.toLocaleTimeString("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false })

/** Soma dias a uma data ISO (sem fuso). */
export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 0 = domingo … 6 = sábado. */
export const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay()

/** Segunda-feira da semana da data. */
export const weekStart = (iso: string) => addDays(iso, -((weekdayOf(iso) + 6) % 7))

export const isISODate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

/** "Seg, 13/10" */
export const formatDayShort = (iso: string) => `${WEEKDAY_SHORT[weekdayOf(iso)]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Minutos desde 00:00 de "HH:MM[:SS]". */
export const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** "07:00" + 60 → "08:00" */
export function addMinutes(time: string, minutes: number) {
  const total = minutesOf(time) + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}
