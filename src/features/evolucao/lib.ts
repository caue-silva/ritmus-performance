/** Cálculos da evolução (sem dependências: rodam no navegador e no servidor). */

export type Metric = "weight_kg" | "waist_cm" | "abdomen_cm" | "bmi"

export const METRICS: { id: Metric; label: string; unit: string; decimals: number }[] = [
  { id: "weight_kg", label: "Peso", unit: "kg", decimals: 1 },
  { id: "waist_cm", label: "Cintura", unit: "cm", decimals: 1 },
  { id: "abdomen_cm", label: "Abdômen", unit: "cm", decimals: 1 },
  { id: "bmi", label: "IMC", unit: "", decimals: 1 },
]

export type MeasurementPoint = {
  id: string
  measured_at: string
  weight_kg: number | null
  waist_cm: number | null
  abdomen_cm: number | null
  bmi: number | null
  notes: string | null
  source: string
  created_by_name: string | null
}

/** IMC = peso / altura² (altura em metros), com 1 casa. */
export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined) {
  if (!weightKg || !heightCm) return null
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function bmiLabel(value: number) {
  if (value < 18.5) return "abaixo do peso"
  if (value < 25) return "peso adequado"
  if (value < 30) return "sobrepeso"
  return "obesidade"
}

/** 72.45 → "72,5" */
export const formatNumber = (value: number, decimals = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

/** Diferença assinada: "−4,2 kg", "+0,8 cm", "0 kg" */
export function formatDelta(delta: number, unit: string, decimals = 1) {
  const rounded = Math.round(delta * 10 ** decimals) / 10 ** decimals
  if (rounded === 0) return `0${unit ? ` ${unit}` : ""}`
  const sign = rounded > 0 ? "+" : "−"
  return `${sign}${formatNumber(Math.abs(rounded), decimals)}${unit ? ` ${unit}` : ""}`
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1]!
export const monthShort = (iso: string) => MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]!

/** "desde março" (outro mês) ou "desde 05/10" (mesmo mês). */
export function sinceLabel(fromISO: string, todayISO: string) {
  if (fromISO.slice(0, 7) === todayISO.slice(0, 7)) return `desde ${fromISO.slice(8, 10)}/${fromISO.slice(5, 7)}`
  const sameYear = fromISO.slice(0, 4) === todayISO.slice(0, 4)
  return `desde ${monthName(fromISO)}${sameYear ? "" : ` de ${fromISO.slice(0, 4)}`}`
}

/** Primeiro e último valor de uma métrica no período, e a diferença. */
export function variation(points: MeasurementPoint[], metric: Metric) {
  const withValue = points.filter((p) => p[metric] !== null)
  if (withValue.length === 0) return null
  const first = withValue[0]!
  const last = withValue.at(-1)!
  return {
    first: first[metric]!,
    last: last[metric]!,
    firstAt: first.measured_at,
    lastAt: last.measured_at,
    delta: last[metric]! - first[metric]!,
    count: withValue.length,
  }
}

export type MonthFrequency = { month: string; present: number; absent: number; expected: number; rate: number | null }

/**
 * Frequência mensal: presentes ÷ aulas que já aconteceram (presente + faltas).
 * "Previsto" de aula passada sem registro não conta (não sabemos se veio).
 */
export function monthlyFrequency(
  rows: { date: string; status: "previsto" | "presente" | "falta" | "falta_justificada" }[],
  todayISO: string,
  months = 6,
): MonthFrequency[] {
  const out: MonthFrequency[] = []
  const [y, m] = todayISO.split("-").map(Number) as [number, number]
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    const key = d.toISOString().slice(0, 7)
    const inMonth = rows.filter((r) => r.date.startsWith(key) && r.date <= todayISO)
    const present = inMonth.filter((r) => r.status === "presente").length
    const absent = inMonth.filter((r) => r.status === "falta" || r.status === "falta_justificada").length
    const expected = present + absent
    out.push({ month: `${key}-01`, present, absent, expected, rate: expected ? Math.round((present / expected) * 100) : null })
  }
  return out
}
