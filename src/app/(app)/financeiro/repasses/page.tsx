import { ArrowLeft, ChevronLeft, ChevronRight, HandCoins } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { competenceLabel } from "@/features/financeiro/lib"
import { PayoutCard } from "@/features/repasses/components/payout-card"
import { getPayoutDetails, getPayoutReport, monthStart, shiftMonth } from "@/features/repasses/queries"
import { requireAdmin } from "@/lib/auth"
import { formatBRL } from "@/lib/format"

export const metadata: Metadata = { title: "Repasses" }

export default async function RepassesPage({ searchParams }: PageProps<"/financeiro/repasses">) {
  await requireAdmin()
  const { mes } = await searchParams
  const current = monthStart()
  const month = typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : current
  const rows = await getPayoutReport(month)
  const details = await getPayoutDetails(month, rows.map((r) => r.personal_id))
  const closed = month < current
  const total = rows.reduce((n, r) => n + r.total_cents, 0)
  const href = (m: string) => (m === current ? "/financeiro/repasses" : `/financeiro/repasses?mes=${m.slice(0, 7)}`)

  return (
    <div className="grid gap-5">
      <div>
        <Button asChild variant="ghost" className="-ml-3 mb-2">
          <Link href="/financeiro">
            <ArrowLeft /> Financeiro
          </Link>
        </Button>
        <PageHeader
          title="Repasses"
          description="Quanto cada professor recebe pelas mensalidades pagas pelos próprios alunos no mês, mais os bônus de campanha."
          className="mb-0"
        />
      </div>

      <div className="flex items-center gap-2">
        <Link href={href(shiftMonth(month, -1))} aria-label="Mês anterior" className="grid size-tap-lg place-items-center rounded-full border border-input bg-card">
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <div className="flex-1 text-center">
          <p className="font-display text-2xl font-bold uppercase">{competenceLabel(month)}</p>
          <p className="text-sm text-muted-foreground">{closed ? "Mês encerrado" : "Mês em andamento: valores parciais"}</p>
        </div>
        <Link href={href(shiftMonth(month, 1))} aria-label="Próximo mês" className="grid size-tap-lg place-items-center rounded-full border border-input bg-card">
          <ChevronRight className="size-6" aria-hidden />
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nenhum repasse neste mês"
          description="Defina a comissão de cada professor em Equipe. Os repasses aparecem conforme os alunos pagam."
        />
      ) : (
        <>
          <p className="text-muted-foreground">
            Total de repasses: <span className="font-semibold text-foreground">{formatBRL(total)}</span>
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <PayoutCard key={r.personal_id} row={r} lines={details.get(r.personal_id) ?? []} month={month} closed={closed} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
