/**
 * Pix copia e cola ESTÁTICO (BR Code, padrão EMV do Banco Central), gerado aqui
 * mesmo — sem banco, sem API. O pagamento continua sendo confirmado à mão.
 */

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), em 4 dígitos hexa maiúsculos. */
export function crc16(payload: string) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

/** Remove acentos e caracteres fora do permitido; maiúsculas; corta no tamanho. */
const clean = (v: string, max: number) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max)

export type PixKeyKind = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria"

/**
 * Normaliza a chave como o Pix espera (telefone com +55, CPF/CNPJ só dígitos).
 * Com o tipo informado, valida só esse tipo; sem ele, tenta deduzir.
 */
export function normalizePixKey(raw: string, kind?: PixKeyKind | null): { key: string; kind: PixKeyKind } | null {
  const v = raw.trim()
  const d = v.replace(/\D/g, "")
  if (kind === "cpf") return d.length === 11 ? { key: d, kind } : null
  if (kind === "cnpj") return d.length === 14 ? { key: d, kind } : null
  if (kind === "telefone") {
    const national = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d
    return national.length === 10 || national.length === 11 ? { key: `+55${national}`, kind } : null
  }
  if (kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? { key: v.toLowerCase(), kind } : null
  if (kind === "aleatoria")
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? { key: v.toLowerCase(), kind } : null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return { key: v.toLowerCase(), kind: "aleatoria" }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return { key: v.toLowerCase(), kind: "email" }
  const digits = v.replace(/\D/g, "")
  if (v.startsWith("+")) return digits.length >= 12 ? { key: `+${digits}`, kind: "telefone" } : null
  if (digits.length === 14) return { key: digits, kind: "cnpj" }
  if (digits.length === 11 && /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(v)) return { key: digits, kind: "cpf" }
  if (digits.length === 11 || digits.length === 10) return { key: `+55${digits}`, kind: "telefone" }
  return null
}

export type StaticPixInput = {
  key: string
  keyType?: PixKeyKind | null
  receiverName: string
  city: string
  amountCents?: number
  /** Identificador (até 25 letras/números). Sem ele, usa "***". */
  txid?: string
  description?: string
}

export function buildPixPayload(input: StaticPixInput): string {
  const normalized = normalizePixKey(input.key, input.keyType)
  if (!normalized) throw new Error("Chave Pix inválida")
  const account =
    tlv("00", "br.gov.bcb.pix") + tlv("01", normalized.key) + (input.description ? tlv("02", clean(input.description, 40)) : "")
  const txid = (input.txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***"
  const body =
    tlv("00", "01") +
    tlv("26", account) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (input.amountCents ? tlv("54", (input.amountCents / 100).toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", clean(input.receiverName, 25)) +
    tlv("60", clean(input.city, 15)) +
    tlv("62", tlv("05", txid)) +
    "6304"
  return body + crc16(body)
}
