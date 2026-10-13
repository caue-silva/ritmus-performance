import { describe, expect, it } from "vitest"

import { buildPixPayload, crc16, normalizePixKey } from "@/integrations/payments/pix"

describe("Pix copia e cola (BR Code)", () => {
  it("bate com o exemplo oficial do manual do Banco Central", () => {
    const body =
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304"
    expect(crc16(body)).toBe("1D3D")
  })

  it("monta o payload com valor, nome e cidade sem acento e CRC no fim", () => {
    const p = buildPixPayload({ key: "pix@ritmus.test", receiverName: "Ritmus Performance", city: "Pilar do Sul", amountCents: 36000, txid: "RITMUS123" })
    expect(p.startsWith("000201")).toBe(true)
    expect(p).toContain("0014br.gov.bcb.pix0115pix@ritmus.test")
    expect(p).toContain("5406360.00")
    expect(p).toContain("5918RITMUS PERFORMANCE")
    expect(p).toContain("6012PILAR DO SUL")
    expect(p).toContain("62130509RITMUS123")
    expect(p.slice(-8, -4)).toBe("6304")
    expect(crc16(p.slice(0, -4))).toBe(p.slice(-4))
  })

  it("normaliza a chave", () => {
    expect(normalizePixKey("(15) 99111-0001")).toEqual({ key: "+5515991110001", kind: "telefone" })
    expect(normalizePixKey("529.982.247-25")).toEqual({ key: "52998224725", kind: "cpf" })
    expect(normalizePixKey("12.345.678/0001-90")).toEqual({ key: "12345678000190", kind: "cnpj" })
    expect(normalizePixKey("Gabriel@Ritmus.com")).toEqual({ key: "gabriel@ritmus.com", kind: "email" })
    expect(normalizePixKey("123e4567-e12b-12d1-a456-426655440000")?.kind).toBe("aleatoria")
    expect(normalizePixKey("abc")).toBeNull()
    // Com o tipo informado não há ambiguidade entre CPF e celular.
    expect(normalizePixKey("15991110001", "telefone")).toEqual({ key: "+5515991110001", kind: "telefone" })
    expect(normalizePixKey("15991110001", "cpf")).toEqual({ key: "15991110001", kind: "cpf" })
    expect(normalizePixKey("1599111", "telefone")).toBeNull()
  })
})
