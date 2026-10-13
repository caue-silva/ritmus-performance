"use client"

import { AlarmClock, BadgeDollarSign, ClipboardList, HeartPulse, PartyPopper, Siren, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { ActivationSheet } from "@/features/alunos/components/activation-sheet"
import { ClearanceSheet, FeeSheet } from "@/features/alunos/components/quick-sheets"
import type { ActivationOptions } from "@/features/alunos/queries"
import { formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { Task, TaskKind } from "../queries"

type Group = "cobrancas" | "cadastros" | "saude" | "valores"

const GROUPS: { id: Group; label: string; kinds: TaskKind[] }[] = [
  { id: "cobrancas", label: "Cobranças", kinds: ["atrasado", "vence_hoje"] },
  { id: "cadastros", label: "Cadastros", kinds: ["cadastro"] },
  { id: "saude", label: "Liberações", kinds: ["liberacao"] },
  { id: "valores", label: "Valores", kinds: ["valor"] },
]

const KIND: Record<TaskKind, { icon: LucideIcon; tone: string; action: string }> = {
  atrasado: { icon: Siren, tone: "bg-destructive/10 text-destructive", action: "Ver cobrança" },
  vence_hoje: { icon: AlarmClock, tone: "bg-warning-soft text-warning", action: "Ver cobrança" },
  cadastro: { icon: ClipboardList, tone: "bg-brand-soft text-brand-ink", action: "Ativar" },
  liberacao: { icon: HeartPulse, tone: "bg-warning-soft text-warning", action: "Registrar liberação" },
  valor: { icon: BadgeDollarSign, tone: "bg-secondary text-secondary-foreground", action: "Definir valor" },
}

function reason(t: Task) {
  const when = t.refDate ? formatDate(t.refDate).slice(0, 5) : null
  switch (t.kind) {
    case "atrasado":
      return `Venceu em ${when} · ${formatBRL(t.amountCents ?? 0)}`
    case "vence_hoje":
      return `Vence hoje · ${formatBRL(t.amountCents ?? 0)}`
    case "cadastro":
      return when ? `Cadastro recebido em ${when}. Falta ativar.` : "Cadastro recebido. Falta ativar."
    case "liberacao":
      return "Respondeu “sim” no PAR-Q. Precisa da liberação médica para ativar."
    case "valor":
      return "Aluno ativo sem valor de mensalidade definido."
  }
}

type OpenSheet = { kind: "cadastro" | "liberacao" | "valor"; task: Task } | null

export function TaskBoard({ tasks, options }: { tasks: Task[]; options: ActivationOptions }) {
  const router = useRouter()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Group | "todas">("todas")
  const [sheet, setSheet] = useState<OpenSheet>(null)

  const visible = tasks.filter((t) => !hidden.has(t.key))
  const hide = (key: string) => setHidden((h) => new Set(h).add(key))
  const unhide = (key: string) => {
    setHidden((h) => {
      const next = new Set(h)
      next.delete(key)
      return next
    })
    router.refresh()
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        tone="positive"
        title="Tudo em dia por hoje"
        description="Novos cadastros, liberações médicas e cobranças aparecem aqui assim que surgirem."
      />
    )
  }

  const card = (t: Task) => (
    <TaskCard
      key={t.key}
      task={t}
      onAction={() => {
        if (t.kind === "cadastro" || t.kind === "liberacao" || t.kind === "valor") setSheet({ kind: t.kind, task: t })
        else router.push(`/alunos/${t.studentId}`)
      }}
    />
  )

  const countOf = (g: Group) => visible.filter((t) => GROUPS.find((x) => x.id === g)!.kinds.includes(t.kind)).length
  const filtered = filter === "todas" ? visible : visible.filter((t) => GROUPS.find((g) => g.id === filter)!.kinds.includes(t.kind))

  return (
    <>
      {/* Celular: lista única por urgência, com filtros rápidos */}
      <div className="md:hidden">
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4" role="toolbar" aria-label="Filtrar tarefas">
          {[{ id: "todas" as const, label: "Todas", count: visible.length }, ...GROUPS.map((g) => ({ ...g, count: countOf(g.id) }))]
            .filter((f) => f.id === "todas" || f.count > 0)
            .map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex min-h-tap shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                  filter === f.id ? "border-foreground bg-foreground text-background" : "border-input bg-card",
                )}
              >
                {f.label}
                <span className={cn("rounded-full px-1.5 text-xs", filter === f.id ? "bg-background/20" : "bg-secondary")}>{f.count}</span>
              </button>
            ))}
        </div>
        <ul className="grid gap-3">{filtered.map((t) => <li key={t.key}>{card(t)}</li>)}</ul>
      </div>

      {/* Tablet e computador: colunas por tipo, tudo de uma vez */}
      <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
        {GROUPS.map((g) => {
          const items = visible.filter((t) => g.kinds.includes(t.kind))
          return (
            <section key={g.id} aria-labelledby={`col-${g.id}`} className="grid content-start gap-3 rounded-2xl bg-muted/60 p-3">
              <h2 id={`col-${g.id}`} className="flex items-center justify-between px-1 font-display text-lg font-bold uppercase">
                {g.label}
                <span className="rounded-full bg-card px-2 text-sm">{items.length}</span>
              </h2>
              {items.length ? items.map(card) : <p className="px-1 pb-2 text-sm text-muted-foreground">Nada pendente aqui.</p>}
            </section>
          )
        })}
      </div>

      {sheet?.kind === "cadastro" && (
        <ActivationSheet
          key={sheet.task.key}
          open
          onOpenChange={(o) => !o && setSheet(null)}
          options={options}
          target={{
            id: sheet.task.studentId,
            full_name: sheet.task.name,
            personal_id: sheet.task.personalId,
            weekly_frequency: sheet.task.weeklyFrequency,
            fee_cents: sheet.task.feeCents,
            due_day: sheet.task.dueDay,
          }}
          onActivated={() => hide(sheet.task.key)}
          onUndone={() => unhide(sheet.task.key)}
        />
      )}
      {sheet?.kind === "liberacao" && (
        <ClearanceSheet
          key={sheet.task.key}
          open
          onOpenChange={(o) => !o && setSheet(null)}
          studentId={sheet.task.studentId}
          name={sheet.task.name}
          onDone={() => hide(sheet.task.key)}
          onUndone={() => unhide(sheet.task.key)}
        />
      )}
      {sheet?.kind === "valor" && (
        <FeeSheet
          key={sheet.task.key}
          open
          onOpenChange={(o) => !o && setSheet(null)}
          studentId={sheet.task.studentId}
          name={sheet.task.name}
          currentFee={sheet.task.feeCents}
          frequency={sheet.task.weeklyFrequency}
          referenceFees={options.referenceFees}
          onDone={() => hide(sheet.task.key)}
          onUndone={() => unhide(sheet.task.key)}
        />
      )}
    </>
  )
}

function TaskCard({ task, onAction }: { task: Task; onAction: () => void }) {
  const { icon: Icon, tone, action } = KIND[task.kind]
  return (
    <article className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", tone)}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <Link href={`/alunos/${task.studentId}`} className="font-semibold underline-offset-4 hover:underline">
            {task.name}
          </Link>
          <p className="text-sm text-muted-foreground">{reason(task)}</p>
        </div>
      </div>
      <Button onClick={onAction} className="w-full" variant={task.kind === "cadastro" ? "default" : "dark"}>
        {action}
      </Button>
    </article>
  )
}
