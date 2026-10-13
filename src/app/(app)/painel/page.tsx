import { Trophy } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/shell/page-header"
import { competenceLabel } from "@/features/financeiro/lib"
import { getDashboard } from "@/features/painel/queries"
import { getPayoutReport, getRanking, monthStart } from "@/features/repasses/queries"
import { requireAdmin } from "@/lib/auth"
import { firstName, formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Painel" }

function Tile({ label, value, hint, href, alert }: { label: string; value: string; hint: string; href: string; alert?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "grid gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30",
        alert ? "border-destructive/30" : "border-border",
      )}
    >
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-bold xl:text-3xl", alert && "text-destructive")}>{value}</span>
      <span className="text-sm text-muted-foreground">{hint}</span>
    </Link>
  )
}

/** Barra de progresso: trilho = total, parte laranja = realizado. */
function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      className="h-3 overflow-hidden rounded-full bg-border"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function PainelPage() {
  await requireAdmin()
  const month = monthStart()
  const [d, ranking, payouts] = await Promise.all([getDashboard(), getRanking(month), getPayoutReport(month)])
  const payoutTotal = payouts.reduce((n, r) => n + r.total_cents, 0)
  const bonusTotal = payouts.reduce((n, r) => n + r.bonus_cents, 0)
  const rev = d.revenue.current
  const revPct = rev.expected ? Math.round((rev.received / rev.expected) * 100) : 0

  return (
    <div className="grid gap-6">
      <PageHeader title="Painel" description={`Como está o estúdio em ${competenceLabel(rev.competence).toLowerCase()}.`} className="mb-0" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Alunos ativos"
          value={String(d.students.active)}
          hint={d.students.newThisMonth ? `+${d.students.newThisMonth} neste mês` : `${d.students.paused} pausados`}
          href="/alunos?status=ativo"
        />
        <Tile label="Ocupação dos horários" value={`${d.occupancy.rate}%`} hint={`${d.occupancy.taken} de ${d.occupancy.capacity} vagas fixas`} href="/agenda" />
        <Tile label="Recebido no mês" value={formatBRL(rev.received)} hint={`de ${formatBRL(rev.expected)} previstos (${revPct}%)`} href="/financeiro" />
        <Tile
          label="Inadimplência"
          value={formatBRL(d.delinquency.total)}
          hint={d.delinquency.students ? `${d.delinquency.students} ${d.delinquency.students === 1 ? "aluno" : "alunos"} em atraso` : "ninguém em atraso"}
          href="/financeiro/relatorios"
          alert={d.delinquency.total > 0}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="receita" className="grid content-start gap-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 id="receita" className="font-display text-xl font-bold uppercase">
              Receita: recebido × previsto
            </h2>
            <p className="text-sm text-muted-foreground">A barra cheia é o previsto; a parte laranja já entrou.</p>
          </div>
          <ul className="grid gap-4">
            {[...d.revenue.months]
              .filter((m) => m.count > 0)
              .reverse()
              .map((m) => (
                <li key={m.competence} className="grid gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                    <span className="font-semibold">{competenceLabel(m.competence)}</span>
                    <span className="tabular-nums">
                      <span className="font-semibold">{formatBRL(m.received)}</span>
                      <span className="text-muted-foreground"> de {formatBRL(m.expected)}</span>
                    </span>
                  </div>
                  <Meter value={m.received} max={m.expected} label={`${competenceLabel(m.competence)}: ${formatBRL(m.received)} de ${formatBRL(m.expected)}`} />
                </li>
              ))}
          </ul>
        </section>

        <section aria-labelledby="ocupacao" className="grid content-start gap-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 id="ocupacao" className="font-display text-xl font-bold uppercase">
              Ocupação por personal
            </h2>
            <p className="text-sm text-muted-foreground">Vagas fixas ocupadas nos horários de cada um (até 4 por horário).</p>
          </div>
          <ul className="grid gap-4">
            {d.occupancy.byPersonal.map((p) => (
              <li key={p.id} className="grid gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="font-semibold">{firstName(p.name)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {p.taken} de {p.capacity} vagas · {Math.round((p.taken / p.capacity) * 100)}%
                  </span>
                </div>
                <Meter value={p.taken} max={p.capacity} label={`${firstName(p.name)}: ${p.taken} de ${p.capacity} vagas`} />
              </li>
            ))}
          </ul>
          <p className="border-t border-border pt-3 text-sm">
            <span className="font-semibold">Frequência no mês: {d.attendance.rate === null ? "—" : `${d.attendance.rate}%`}</span>
            <span className="text-muted-foreground"> · {d.attendance.present} presenças em {d.attendance.recorded} aulas com registro</span>
          </p>
        </section>
      </div>

      <section aria-labelledby="professores" className="grid content-start gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="professores" className="flex items-center gap-2 font-display text-xl font-bold uppercase">
              <Trophy className="size-5 text-brand-ink" aria-hidden /> Professores no mês
            </h2>
            <p className="text-sm text-muted-foreground">Ranking por aulas dadas (com aluno presente) e repasses até agora.</p>
          </div>
          <Link href="/financeiro/repasses" className="grid text-right hover:underline">
            <span className="text-2xl font-bold tabular-nums">{formatBRL(payoutTotal)}</span>
            <span className="text-sm text-muted-foreground">em repasses{bonusTotal > 0 && ` · ${formatBRL(bonusTotal)} de bônus`}</span>
          </Link>
        </div>
        {ranking.every((r) => r.classes === 0) ? (
          <p className="text-muted-foreground">Nenhuma aula com presença ainda neste mês.</p>
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ranking.map((r) => (
              <li key={r.personal_id} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
                <span className={cn("w-7 font-display text-xl font-bold", r.rank_position === 1 && "text-brand-ink")}>{r.rank_position}º</span>
                <span className="flex-1 font-semibold">{firstName(r.full_name)}</span>
                <span className="text-sm tabular-nums">
                  {r.classes} {r.classes === 1 ? "aula" : "aulas"} · {r.checkins} presenças
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {d.students.waiting > 0 && (
        <Link href="/tarefas" className="rounded-xl border border-border bg-card px-5 py-4 font-medium hover:border-foreground/30">
          {d.students.waiting} {d.students.waiting === 1 ? "aluno ainda não foi ativado" : "alunos ainda não foram ativados"} → ver na Central de tarefas
        </Link>
      )}
    </div>
  )
}
