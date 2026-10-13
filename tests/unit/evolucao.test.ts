import { describe, expect, it } from "vitest"

import { bmi, formatDelta, monthlyFrequency, sinceLabel, variation, type MeasurementPoint } from "@/features/evolucao/lib"

const point = (measured_at: string, weight_kg: number | null, waist_cm: number | null = null): MeasurementPoint => ({
  id: measured_at,
  measured_at,
  weight_kg,
  waist_cm,
  abdomen_cm: null,
  bmi: null,
  notes: null,
  source: "aula",
  created_by_name: null,
})

describe("evolução", () => {
  it("IMC", () => {
    expect(bmi(72, 175)).toBe(23.5)
    expect(bmi(null, 175)).toBeNull()
  })

  it("variação desde o início, ignorando medições sem o valor", () => {
    const v = variation([point("2026-08-01", 80, 90), point("2026-09-01", null, 88), point("2026-10-01", 75.8)], "weight_kg")
    expect(v).toMatchObject({ first: 80, last: 75.8, count: 2 })
    expect(formatDelta(v!.delta, "kg")).toBe("−4,2 kg")
    expect(formatDelta(0.04, "cm")).toBe("0 cm")
    expect(formatDelta(1.25, "cm")).toBe("+1,3 cm")
  })

  it("rótulo de período", () => {
    expect(sinceLabel("2026-03-10", "2026-10-12")).toBe("desde março")
    expect(sinceLabel("2026-10-05", "2026-10-12")).toBe("desde 05/10")
    expect(sinceLabel("2025-11-05", "2026-10-12")).toBe("desde novembro de 2025")
  })

  it("frequência mensal só conta aulas que já aconteceram e têm registro", () => {
    const rows = [
      { date: "2026-10-01", status: "presente" as const },
      { date: "2026-10-03", status: "falta" as const },
      { date: "2026-10-05", status: "presente" as const },
      { date: "2026-10-08", status: "previsto" as const },
      { date: "2026-10-20", status: "previsto" as const },
      { date: "2026-09-10", status: "falta_justificada" as const },
    ]
    const f = monthlyFrequency(rows, "2026-10-12", 2)
    expect(f.map((x) => x.month)).toEqual(["2026-09-01", "2026-10-01"])
    expect(f[1]).toMatchObject({ present: 2, absent: 1, rate: 67 })
    expect(f[0]).toMatchObject({ present: 0, absent: 1, rate: 0 })
  })
})
