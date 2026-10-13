import { ArrowLeft, MessageCircle, PartyPopper } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { competenceLabel } from "@/features/financeiro/lib"
import { getDelinquents, getMonthlyReport } from "@/features/financeiro/queries"
import { requireAdmin } from "@/lib/auth"
import { formatBRL, formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Relatórios financeiros" }

export default async function RelatoriosPage() {
  await requireAdmin()
  const [all, delinquents] = await Promise.all([getMonthlyReport(6), getDelinquents()])
  // Começa no primeiro mês que teve mensalidade.
  const firstWithCharges = all.findIndex((m) => m.count > 0)
  const months = firstWithCharges === -1 ? [] : all.slice(firstWithCharges)
  const totalOverdue = delinquents.reduce((n, d) => n + d.total_cents, 0)

  return (
    <div className="grid gap-6">
      <div>
        <Button asChild variant="ghost" className="-ml-3 mb-2">
          <Link href="/financeiro">
            <ArrowLeft /> Financeiro
          </Link>
        </Button>
        <PageHeader title="Relatórios" description="Quanto entrou de cada mês e quem está com mensalidade atrasada." className="mb-0" />
      </div>

      <section aria-labelledby="mensal" className="grid gap-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 id="mensal" className="font-display text-xl font-bold uppercase">
            Recebido × previsto
          </h2>
          <p className="text-sm text-muted-foreground">Pelo mês da mensalidade. A barra cheia é o previsto; a parte laranja é o que já entrou.</p>
        </div>
        {months.length === 0 && <p className="text-muted-foreground">Ainda não há mensalidades.</p>}
        <ul className="grid gap-4">
          {[...months].reverse().map((m) => {
            const pct = m.expected ? Math.round((m.received / m.expected) * 100) : 0
            return (
              <li key={m.competence} className="grid gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">{competenceLabel(m.competence)}</span>
                  <span className="text-sm tabular-nums">
                    {m.expected ? (
                      <>
                        <span className="font-semibold">{formatBRL(m.received)}</span>
                        <span className="text-muted-foreground"> de {formatBRL(m.expected)} · {pct}%</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Sem mensalidades</span>
                    )}
                  </span>
                </div>
                {m.expected > 0 && (
                  <div
                    className="h-3 overflow-hidden rounded-full bg-border"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={m.expected / 100}
                    aria-valuenow={m.received / 100}
                    aria-label={`${competenceLabel(m.competence)}: recebido ${formatBRL(m.received)} de ${formatBRL(m.expected)}`}
                  >
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {m.overdue > 0 && <span className="text-sm font-medium text-destructive">{formatBRL(m.overdue)} em atraso</span>}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="inadimplentes" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="inadimplentes" className="font-display text-xl font-bold uppercase">
            Inadimplentes
          </h2>
          {totalOverdue > 0 && <span className="font-semibold text-destructive">{formatBRL(totalOverdue)} em atraso</span>}
        </div>
        {delinquents.length === 0 ? (
          <EmptyState icon={PartyPopper} tone="positive" title="Ninguém em atraso" description="Todas as mensalidades vencidas foram pagas." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {delinquents.map((d) => (
              <li key={d.student_id} className="grid gap-3 rounded-xl border border-destructive/30 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-0.5">
                    <Link href={`/alunos/${d.student_id}`} className="font-semibold underline-offset-4 hover:underline">
                      {d.full_name}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {d.charges.length} {d.charges.length === 1 ? "mensalidade" : "mensalidades"} · a mais antiga venceu em {formatDate(d.oldest_due)} ({d.max_days}{" "}
                      {d.max_days === 1 ? "dia" : "dias"})
                    </span>
                  </div>
                  <span className="text-lg font-bold text-destructive tabular-nums">{formatBRL(d.total_cents)}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  <Button asChild variant="dark">
                    <a href={d.charges[0]!.whatsapp_url} target="_blank" rel="noreferrer">
                      <MessageCircle aria-hidden /> Cobrar no WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/financeiro/${d.charges[0]!.id}`}>Ver mensalidade</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
