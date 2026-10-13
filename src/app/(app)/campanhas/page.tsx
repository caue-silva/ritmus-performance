import { Gift, Megaphone, Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { getCampaigns } from "@/features/campanhas/queries"
import { requireAdmin } from "@/lib/auth"
import { todaySP } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Campanhas" }

export default async function CampanhasPage() {
  await requireAdmin()
  const [campaigns, today] = [await getCampaigns(), todaySP()]
  const status = (c: { starts_on: string; ends_on: string }) =>
    c.ends_on < today ? { label: "Encerrada", tone: "bg-muted text-muted-foreground" } : c.starts_on > today ? { label: "Agendada", tone: "bg-secondary text-secondary-foreground" } : { label: "No ar", tone: "bg-success-soft text-success" }

  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Artes e bônus que aparecem na tela inicial dos professores."
        actions={
          <Button asChild size="lg">
            <Link href="/campanhas/nova">
              <Plus aria-hidden /> Nova campanha
            </Link>
          </Button>
        }
      />
      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhuma campanha ainda"
          description="Crie a primeira: uma arte com período, e se quiser o bônus de indicação para quem trouxer aluno novo."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const s = status(c)
            return (
              <li key={c.id}>
                <Link href={`/campanhas/${c.id}`} className="block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/30">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arte da campanha
                    <img src={c.image_url} alt="" className="aspect-[2/1] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[2/1] place-items-center bg-sidebar font-display text-2xl font-bold text-sidebar-foreground uppercase">{c.title}</div>
                  )}
                  <div className="grid gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-semibold", s.tone)}>{s.label}</span>
                      {c.referral_bonus && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-sm font-semibold text-brand-ink">
                          <Gift className="size-3.5" aria-hidden /> Bônus de indicação
                        </span>
                      )}
                    </div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(c.starts_on)} a {formatDate(c.ends_on)}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
