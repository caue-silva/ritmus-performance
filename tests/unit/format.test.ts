import { describe, expect, it } from "vitest"

import { firstName, formatBRL, formatCPF, formatDate, formatPhone, initials, summarizeSchedule } from "@/lib/format"

describe("formatação pt-BR", () => {
  it("moeda em reais a partir de centavos", () => {
    expect(formatBRL(36000)).toBe("R$ 360,00")
    expect(formatBRL(1999)).toBe("R$ 19,99")
  })

  it("datas em dd/mm/aaaa, sem deslocar o dia por fuso", () => {
    expect(formatDate("2026-03-01")).toBe("01/03/2026")
    // 02:30 UTC ainda é dia 11 em São Paulo.
    expect(formatDate("2026-10-12T02:30:00Z")).toBe("11/10/2026")
  })

  it("telefone e CPF", () => {
    expect(formatPhone("15991234567")).toBe("(15) 99123-4567")
    expect(formatPhone("1532345678")).toBe("(15) 3234-5678")
    expect(formatCPF("12345678901")).toBe("123.456.789-01")
  })

  it("nomes", () => {
    expect(firstName("  Gabriel Paiva ")).toBe("Gabriel")
    expect(initials("Ana Maria Souza")).toBe("AS")
  })

  it("resumo de horários fixos", () => {
    const week = (time: string) => [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_time: time }))
    expect(summarizeSchedule([...week("06:00:00"), ...week("07:00:00"), { weekday: 6, start_time: "08:00:00" }])).toBe(
      "Seg a Sex às 6h e 7h · Sáb às 8h",
    )
    expect(summarizeSchedule([1, 3, 5].map((weekday) => ({ weekday, start_time: "19:30:00" })))).toBe("Seg, Qua e Sex às 19h30")
    expect(summarizeSchedule([])).toBe("Sem horários fixos")
  })
})
