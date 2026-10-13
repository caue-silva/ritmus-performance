/** Validações e máscaras pt-BR, sem dependências (usadas no navegador e no servidor). */

export const onlyDigits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "")

export function isValidCPF(value: string) {
  const d = onlyDigits(value)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const check = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return check(9) === Number(d[9]) && check(10) === Number(d[10])
}

/** Celular (11 dígitos, começa com 9) ou fixo (10 dígitos), com DDD válido. */
export function isValidPhone(value: string) {
  const d = onlyDigits(value)
  if (!/^[1-9][1-9]/.test(d)) return false
  return (d.length === 11 && d[2] === "9") || d.length === 10
}

/** "31/12/1990" → "1990-12-31" (ou null se a data não existir). */
export function parseBRDate(value: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)))
  if (date.getUTCFullYear() !== Number(yyyy) || date.getUTCMonth() !== Number(mm) - 1 || date.getUTCDate() !== Number(dd)) {
    return null
  }
  return `${yyyy}-${mm}-${dd}`
}

/** Idade completa em anos numa data de referência (ISO). */
export function ageOn(birthISO: string, refISO: string) {
  const [by, bm, bd] = birthISO.split("-").map(Number) as [number, number, number]
  const [ry, rm, rd] = refISO.split("-").map(Number) as [number, number, number]
  return ry - by - (rm < bm || (rm === bm && rd < bd) ? 1 : 0)
}

/** Aceita "1,75", "175", "1.75" → centímetros. */
export function parseHeightCm(value: string): number | null {
  const v = value.trim().replace(",", ".")
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return n < 3 ? Math.round(n * 1000) / 10 : n
}

/** Aceita "72,5" ou "72.5". */
export function parseDecimal(value: string): number | null {
  const v = value.trim().replace(",", ".")
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** "R$ 1.234,50" / "350" / "350,00" → centavos. */
export function parseMoneyToCents(value: string): number | null {
  const v = value.replace(/[^\d,.]/g, "")
  if (!v) return null
  const normalized = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v
  const n = Number(normalized)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

// ---------------------------------------------------------------------------
// Máscaras (aplicadas enquanto a pessoa digita)
// ---------------------------------------------------------------------------
export function maskCPF(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2")
}

export function maskPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function maskDate(value: string) {
  const d = onlyDigits(value).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

export function maskCEP(value: string) {
  const d = onlyDigits(value).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}
