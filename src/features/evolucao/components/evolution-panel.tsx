"use client"

import { Plus, Ruler, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { addDays, todaySP } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { deleteMeasurement } from "../actions"
import { formatDelta, formatNumber, METRICS, sinceLabel, variation, type MeasurementPoint, type Metric } from "../lib"
import { MetricLineChart } from "./charts"
import { MeasurementSheet } from "./measurement-sheet"

const PERIODS = [
  { id: "30", label: "30 dias", days: 30 },
  { id: "90", label: "90 dias", days: 90 },
  { id: "180", label: "180 dias", days: 180 },
  { id: "tudo", label: "Tudo", days: null },
] as const

export function EvolutionPanel({
  student,
  points,
  today,
  canMeasure,
  canEditHeight,
  canDelete,
}: {
  student: { id: string; full_name: string }
  points: MeasurementPoint[]
  today: string
  canMeasure: boolean
  canEditHeight: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("90")
  const [metric, setMetric] = useState<Metric>("weight_kg")
  const [measuring, setMeasuring] = useState(false)
  const [deleting, setDeleting] = useState<MeasurementPoint | null>(null)
  const [pendingDelete, startDelete] = useTransition()

  const inPeriod = useMemo(() => {
    const days = PERIODS.find((p) => p.id === period)!.days
    if (!days) return points
    const cutoff = addDays(today, -days)
    return points.filter((p) => todaySP(new Date(p.measured_at)) >= cutoff)
  }, [points, period, today])

  const current = METRICS.find((m) => m.id === metric)!
  const series = inPeriod.filter((p) => p[metric] !== null).map((p) => ({ t: Date.parse(p.measured_at), value: Number(p[metric]) }))

  const newButton = canMeasure && (
    <Button size="lg" onClick={() => setMeasuring(true)}>
      <Plus aria-hidden /> Nova medição
    </Button>
  )

  if (points.length === 0) {
    return (
      <>
        <EmptyState
          icon={Ruler}
          title="Nenhuma medição ainda"
          description="Registre a primeira na aula: toque no nome do aluno na lista do horário."
          action={newButton}
        />
        {measuring && (
          <MeasurementSheet student={student} sessionId={null} canEditHeight={canEditHeight} onClose={() => setMeasuring(false)} onSaved={() => router.refresh()} />
        )}
      </>
    )
  }

  return (
    <div className="grid gap-5">
      {/* Filtros numa linha, acima de tudo o que eles afetam */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Período">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "min-h-tap shrink-0 rounded-full border px-4 text-sm font-semibold",
                period === p.id ? "border-foreground bg-foreground text-background" : "border-input bg-card",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="hidden md:block">{newButton}</div>
      </div>

      {/* Uma medida por cartão; tocar escolhe o gráfico */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRICS.map((m) => {
          const v = variation(inPeriod, m.id)
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={metric === m.id}
              onClick={() => setMetric(m.id)}
              className={cn(
                "grid gap-1 rounded-xl border-2 bg-card p-4 text-left transition-colors",
                metric === m.id ? "border-foreground" : "border-border hover:border-foreground/30",
              )}
            >
              <span className="text-sm font-semibold text-muted-foreground">{m.label}</span>
              <span className="text-2xl font-bold">
                {v ? formatNumber(v.last, m.decimals) : "—"}
                {v && m.unit && <span className="ml-1 text-base font-semibold text-muted-foreground">{m.unit}</span>}
              </span>
              <span className="text-sm text-muted-foreground">
                {v && v.count > 1 ? `${formatDelta(v.delta, m.unit, m.decimals)} ${sinceLabel(v.firstAt.slice(0, 10), today)}` : "Sem comparação ainda"}
              </span>
            </button>
          )
        })}
      </div>

      <section className="rounded-xl border border-border bg-card p-4 md:p-5" aria-labelledby="grafico-titulo">
        <h3 id="grafico-titulo" className="mb-2 font-display text-xl font-bold uppercase">
          {current.label}
          {current.unit && <span className="ml-1 text-base text-muted-foreground normal-case">({current.unit})</span>}
        </h3>
        {series.length >= 2 ? (
          <MetricLineChart data={series} unit={current.unit} label={current.label} />
        ) : (
          <p className="py-10 text-center text-muted-foreground">
            {series.length === 1 ? "Só uma medição neste período. Com a próxima, aparece a linha." : "Nenhuma medição neste período."}
          </p>
        )}
      </section>

      <div className="md:hidden">{newButton && <div className="[&>button]:w-full">{newButton}</div>}</div>

      {/* Histórico completo (também é a versão em tabela do gráfico) */}
      <section aria-labelledby="historico-titulo" className="grid gap-3">
        <h3 id="historico-titulo" className="font-display text-xl font-bold uppercase">
          Histórico
        </h3>
        {/* Celular: cartões (sem rolar para o lado) */}
        <ul className="grid gap-2 md:hidden">
          {[...points].reverse().map((p) => (
            <li key={p.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <div className="grid flex-1 gap-1">
                <span className="font-semibold">{formatDate(p.measured_at)}</span>
                <span className="text-sm tabular-nums">
                  {[
                    p.weight_kg !== null && `${formatNumber(p.weight_kg)} kg`,
                    p.waist_cm !== null && `cintura ${formatNumber(p.waist_cm)} cm`,
                    p.abdomen_cm !== null && `abdômen ${formatNumber(p.abdomen_cm)} cm`,
                    p.bmi !== null && `IMC ${formatNumber(p.bmi)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {p.notes && <span className="text-sm text-muted-foreground">“{p.notes}”</span>}
                <span className="text-xs text-muted-foreground">
                  {p.source === "cadastro" ? "Cadastro do aluno" : `Medido por ${p.created_by_name?.split(" ")[0] ?? "—"}`}
                </span>
              </div>
              {canDelete && (
                <Button variant="ghost" size="icon" aria-label={`Apagar medição de ${formatDate(p.measured_at)}`} onClick={() => setDeleting(p)}>
                  <Trash2 aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {/* Tablet e computador: tabela */}
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-muted/60 text-left text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Data</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Peso</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Cintura</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Abdômen</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">IMC</th>
                <th scope="col" className="px-4 py-3 font-semibold">Quem mediu</th>
                {canDelete && <th scope="col" className="w-12"><span className="sr-only">Apagar</span></th>}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...points].reverse().map((p) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <span className="font-semibold">{formatDate(p.measured_at)}</span>
                    {p.notes && <span className="block max-w-56 text-muted-foreground">“{p.notes}”</span>}
                  </td>
                  <td className="px-3 py-3 text-right">{p.weight_kg !== null ? `${formatNumber(p.weight_kg)} kg` : "—"}</td>
                  <td className="px-3 py-3 text-right">{p.waist_cm !== null ? `${formatNumber(p.waist_cm)} cm` : "—"}</td>
                  <td className="px-3 py-3 text-right">{p.abdomen_cm !== null ? `${formatNumber(p.abdomen_cm)} cm` : "—"}</td>
                  <td className="px-3 py-3 text-right">{p.bmi !== null ? formatNumber(p.bmi) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.source === "cadastro" ? "Cadastro do aluno" : (p.created_by_name?.split(" ")[0] ?? "—")}</td>
                  {canDelete && (
                    <td className="px-1 py-1">
                      <Button variant="ghost" size="icon" aria-label={`Apagar medição de ${formatDate(p.measured_at)}`} onClick={() => setDeleting(p)}>
                        <Trash2 aria-hidden />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {measuring && (
        <MeasurementSheet student={student} sessionId={null} canEditHeight={canEditHeight} onClose={() => setMeasuring(false)} onSaved={() => router.refresh()} />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="font-display text-2xl font-bold uppercase">Apagar medição?</DialogTitle>
          <DialogDescription>
            A medição de {deleting && formatDate(deleting.measured_at)} sai do histórico e dos gráficos. Não dá para desfazer.
          </DialogDescription>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Manter
            </Button>
            <Button
              variant="destructive"
              disabled={pendingDelete}
              onClick={() =>
                startDelete(async () => {
                  const res = await deleteMeasurement(deleting!.id, student.id)
                  setDeleting(null)
                  if (!res.ok) return void toast.error(res.message)
                  toast.success("Medição apagada.")
                  router.refresh()
                })
              }
            >
              Apagar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
