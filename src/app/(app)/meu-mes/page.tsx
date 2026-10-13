import { Award, CheckCircle2, Trophy } from "lucide-react"
import type { Metadata } from "next"

import { StaffAvatar } from "@/components/brand/staff-avatar"
import { PageHeader } from "@/components/shell/page-header"
import { CampaignBanner } from "@/features/campanhas/components/campaign-banner"
import { getActiveCampaigns } from "@/features/campanhas/queries"
import { competenceLabel } from "@/features/financeiro/lib"
import { getAwards, getMyPayout, getRanking, monthStart, shiftMonth } from "@/features/repasses/queries"
import { requireStaff } from "@/lib/auth"
import { firstName, formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Meu mês" }

const monthName = (month: string) => competenceLabel(month).split(" ")[0]!.toLowerCase()

export default async function MeuMesPage() {
  const staff = await requireStaff()
  const month = monthStart()
  const previous = shiftMonth(month, -1)
  const [mine, before, ranking, awards, campaigns] = await Promise.all([
    getMyPayout(month),
    getMyPayout(previous),
    getRanking(month),
    getAwards(staff.id),
    getActiveCampaigns(),
  ])
  const me = ranking.find((r) => r.personal_id === staff.id)
  const leader = ranking[0]

  return (
    <div className="grid gap-5">
      <PageHeader title="Meu mês" description={`${competenceLabel(month)} · ${firstName(staff.full_name)}`} className="mb-0" />

      <CampaignBanner campaigns={campaigns} className="mb-0" />

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="repasse" className="grid content-start gap-3 rounded-xl border border-border bg-card p-5">
          <h2 id="repasse" className="font-display text-xl font-bold uppercase">
            Seu repasse
          </h2>
          <div>
            <p className="font-display text-5xl font-bold tabular-nums">{formatBRL(mine.total_cents)}</p>
            <p className="text-sm text-muted-foreground">até agora em {monthName(month)}, pelas mensalidades já pagas</p>
          </div>
          {mine.bonus_cents > 0 && (
            <p className="rounded-lg bg-brand/15 px-3 py-2 text-sm font-medium">
              Inclui <span className="font-bold">{formatBRL(mine.bonus_cents)}</span> de bônus por aluno que você trouxe. Valeu!
            </p>
          )}
          <p className="flex items-start gap-2 border-t border-border pt-3 text-sm">
            {before.paid_on ? (
              <>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span>
                  Repasse de {monthName(previous)} ({formatBRL(before.paid_amount_cents ?? 0)}) pago em {formatDate(before.paid_on)}.
                </span>
              </>
            ) : before.total_cents > 0 ? (
              <span className="text-muted-foreground">
                Repasse de {monthName(previous)}: {formatBRL(before.total_cents)}, o Gabriel ainda vai registrar o pagamento.
              </span>
            ) : (
              <span className="text-muted-foreground">Sem repasse em {monthName(previous)}.</span>
            )}
          </p>
        </section>

        <section aria-labelledby="ranking" className="grid content-start gap-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-brand-ink" aria-hidden />
            <h2 id="ranking" className="font-display text-xl font-bold uppercase">
              Professor do mês
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Quem der mais aulas em {monthName(month)} ganha o selo. Conta cada aula com aluno presente.
          </p>
          {ranking.every((r) => r.classes === 0) ? (
            <p className="text-muted-foreground">Nenhuma aula com presença ainda neste mês.</p>
          ) : (
            <ol className="grid gap-1">
              {ranking.map((r) => (
                <li
                  key={r.personal_id}
                  className={cn("flex items-center gap-3 rounded-lg px-2 py-2", r.personal_id === staff.id && "bg-secondary")}
                  aria-current={r.personal_id === staff.id ? "true" : undefined}
                >
                  <span className={cn("w-6 text-center font-display text-xl font-bold", r.rank_position === 1 && "text-brand-ink")}>
                    {r.rank_position}º
                  </span>
                  <StaffAvatar name={r.full_name} url={r.avatar_url} size={36} />
                  <span className="flex-1 font-semibold">
                    {r.personal_id === staff.id ? "Você" : firstName(r.full_name)}
                  </span>
                  <span className="text-sm tabular-nums">
                    <span className="font-semibold">{r.classes}</span> {r.classes === 1 ? "aula" : "aulas"}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {me && leader && me.rank_position > 1 && (
            <p className="text-sm font-medium">
              Faltam {leader.classes - me.classes + 1} {leader.classes - me.classes + 1 === 1 ? "aula" : "aulas"} para passar {firstName(leader.full_name)}.
            </p>
          )}
          {awards.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {awards.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-sm font-semibold text-brand-foreground">
                  <Award className="size-4" aria-hidden /> {competenceLabel(a.month)}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
