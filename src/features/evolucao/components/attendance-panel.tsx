import { CalendarCheck } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { formatDayShort } from "@/lib/dates"
import { formatHour } from "@/lib/format"
import { cn } from "@/lib/utils"

import { monthlyFrequency, monthName } from "../lib"
import type { AttendanceRow } from "../queries"
import { FrequencyChart } from "./charts"

const STATUS: Record<AttendanceRow["status"], { label: string; tone: string }> = {
  presente: { label: "Presente", tone: "bg-success-soft text-success" },
  falta: { label: "Faltou", tone: "bg-destructive/10 text-destructive" },
  falta_justificada: { label: "Falta justificada", tone: "bg-warning-soft text-warning" },
  previsto: { label: "Previsto", tone: "bg-secondary text-secondary-foreground" },
}

export function AttendancePanel({ rows, today }: { rows: AttendanceRow[]; today: string }) {
  const past = rows.filter((r) => r.date <= today)
  if (past.length === 0) {
    return <EmptyState icon={CalendarCheck} title="Sem aulas ainda" description="A frequência aparece aqui depois das primeiras aulas." />
  }
  const months = monthlyFrequency(rows, today, 6)
  const thisMonth = months.at(-1)!
  const recorded = past.filter((r) => r.status !== "previsto")
  const recent = recorded.slice(0, 12)
  const makeups = recorded.filter((r) => r.kind === "reposicao" && r.status === "presente").length

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="grid gap-1 rounded-xl border border-border bg-card p-4">
          <span className="text-sm font-semibold text-muted-foreground">Frequência em {monthName(thisMonth.month)}</span>
          <span className="text-3xl font-bold">{thisMonth.rate === null ? "—" : `${thisMonth.rate}%`}</span>
          <span className="text-sm text-muted-foreground">
            {thisMonth.present} de {thisMonth.expected} aulas
          </span>
        </div>
        <div className="grid gap-1 rounded-xl border border-border bg-card p-4">
          <span className="text-sm font-semibold text-muted-foreground">Faltas nos 6 meses</span>
          <span className="text-3xl font-bold">{months.reduce((n, m) => n + m.absent, 0)}</span>
          <span className="text-sm text-muted-foreground">{makeups ? `${makeups} reposições feitas` : "Nenhuma reposição"}</span>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 md:p-5" aria-labelledby="freq-titulo">
        <h3 id="freq-titulo" className="mb-1 font-display text-xl font-bold uppercase">
          Frequência por mês
        </h3>
        <p className="mb-2 text-sm text-muted-foreground">Presenças ÷ aulas com registro (presença ou falta).</p>
        <FrequencyChart data={months} />
      </section>

      <section aria-labelledby="recentes-titulo" className="grid gap-3">
        <h3 id="recentes-titulo" className="font-display text-xl font-bold uppercase">
          Últimas aulas
        </h3>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-24 font-semibold">{formatDayShort(r.date)}</span>
              <span className="flex-1 text-muted-foreground">
                {formatHour(r.start_time)}
                {r.kind === "reposicao" && " · reposição"}
              </span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-semibold", STATUS[r.status].tone)}>{STATUS[r.status].label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
