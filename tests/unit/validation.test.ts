import { describe, expect, it } from "vitest"

import {
  ageOn,
  isValidCPF,
  isValidPhone,
  maskCEP,
  maskCPF,
  maskDate,
  maskPhone,
  parseBRDate,
  parseHeightCm,
  parseMoneyToCents,
} from "@/lib/validation"

describe("validações", () => {
  it("CPF", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true)
    expect(isValidCPF("52998224724")).toBe(false)
    expect(isValidCPF("111.111.111-11")).toBe(false)
    expect(isValidCPF("123")).toBe(false)
  })

  it("telefone", () => {
    expect(isValidPhone("(15) 99123-4567")).toBe(true)
    expect(isValidPhone("(15) 3234-5678")).toBe(true)
    expect(isValidPhone("(15) 89123-4567")).toBe(false)
    expect(isValidPhone("(05) 99123-4567")).toBe(false)
  })

  it("datas dd/mm/aaaa", () => {
    expect(parseBRDate("31/12/1990")).toBe("1990-12-31")
    expect(parseBRDate("31/02/1990")).toBeNull()
    expect(parseBRDate("1990-12-31")).toBeNull()
    expect(ageOn("1990-10-13", "2026-10-12")).toBe(35)
    expect(ageOn("1990-10-12", "2026-10-12")).toBe(36)
  })

  it("números digitados do jeito brasileiro", () => {
    expect(parseHeightCm("1,75")).toBe(175)
    expect(parseHeightCm("168")).toBe(168)
    expect(parseMoneyToCents("R$ 1.234,50")).toBe(123450)
    expect(parseMoneyToCents("350")).toBe(35000)
    expect(parseMoneyToCents("")).toBeNull()
  })
})

describe("máscaras", () => {
  it("formatam enquanto digita", () => {
    expect(maskCPF("52998224725")).toBe("529.982.247-25")
    expect(maskCPF("5299")).toBe("529.9")
    expect(maskPhone("15991234567")).toBe("(15) 99123-4567")
    expect(maskPhone("1532345678")).toBe("(15) 3234-5678")
    expect(maskPhone("159")).toBe("(15) 9")
    expect(maskDate("31121990")).toBe("31/12/1990")
    expect(maskCEP("18185000")).toBe("18185-000")
  })
})
