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
