import { TIME_ZONE } from "@/lib/format"

/** Data de hoje em São Paulo, em ISO (aaaa-mm-dd). */
export const todaySP = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: TIME_ZONE })

/** Soma dias a uma data ISO (sem fuso). */
export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
