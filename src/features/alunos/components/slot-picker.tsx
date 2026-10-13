"use client"

import { useMemo } from "react"

import { formatHour, WEEKDAY_SHORT } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { SlotOption } from "../queries"

/** Escolha de horários fixos por dia, mostrando as vagas ocupadas (ex.: 3/4). */
export function SlotPicker({
  slots,
  selected,
  onChange,
  alreadyMine = [],
  frequency,
}: {
  slots: SlotOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** Horários em que o aluno já está (a vaga dele não conta como ocupada por outro). */
  alreadyMine?: string[]
  frequency?: number
}) {
  const byWeekday = useMemo(() => {
    const map = new Map<number, SlotOption[]>()
    for (const s of slots) map.set(s.weekday, [...(map.get(s.weekday) ?? []), s])
    return [...map.entries()].sort(([a], [b]) => ((a + 6) % 7) - ((b + 6) % 7))
  }, [slots])

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {selected.length} de {frequency || "?"} escolhidos · o número mostra as vagas ocupadas
      </p>
      {byWeekday.map(([weekday, list]) => (
        <div key={weekday} className="grid grid-cols-[2.75rem_1fr] items-start gap-2">
          <span className="pt-3 text-sm font-bold">{WEEKDAY_SHORT[weekday]}</span>
          <div className="flex flex-wrap gap-1.5">
            {list.map((s) => {
              const isSelected = selected.includes(s.id)
              const others = s.taken - (alreadyMine.includes(s.id) ? 1 : 0)
              const full = others >= s.capacity && !isSelected
              const shown = others + (isSelected ? 1 : 0)
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={full}
                  aria-label={`${WEEKDAY_SHORT[weekday]} ${formatHour(s.start_time)}, ${shown} de ${s.capacity} vagas ocupadas${full ? ", lotado" : ""}`}
                  onClick={() => onChange(isSelected ? selected.filter((x) => x !== s.id) : [...selected, s.id])}
                  className={cn(
                    "flex min-h-tap min-w-[4.5rem] flex-col items-center justify-center rounded-lg border px-2 leading-tight transition-colors",
                    isSelected
                      ? "border-foreground bg-foreground text-background"
                      : full
                        ? "cursor-not-allowed border-dashed border-border text-muted-foreground opacity-60"
                        : "border-input bg-card hover:border-foreground/40",
                  )}
                >
                  <span className="font-semibold">{formatHour(s.start_time)}</span>
                  <span className="text-xs">{full ? "lotado" : `${shown}/${s.capacity}`}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
