import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { ChargeList } from "@/features/financeiro/components/charge-list"
import { competenceLabel } from "@/features/financeiro/lib"
import { getChargesByMonth, getFinanceSettings } from "@/features/financeiro/queries"
import { pixReady } from "@/integrations/payments"
import { requireAdmin } from "@/lib/auth"
import { todaySP } from "@/lib/dates"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Financeiro" }

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "vencido", label: "Em atraso" },
  { id: "hoje", label: "Vencem hoje" },
  { id: "pendente", label: "A vencer" },
  { id: "pago", label: "Pagas" },
  { id: "cancelado", label: "Canceladas" },
] as const

const shiftMonth = (competence: string, delta: number) => {
  const [y, m] = competence.split("-").map(Number) as [number, number]
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7)
}

export default async function FinanceiroPage({ searchParams }: PageProps<"/financeiro">) {
  await requireAdmin()
  const sp = await searchParams
  const today = todaySP()
  const month = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : today.slice(0, 7)
  const filter = FILTERS.find((f) => f.id === sp.filtro)?.id ?? "todas"
  const [charges, settings] = await Promise.all([getChargesByMonth(`${month}-01`), getFinanceSettings()])

  const active = charges.filter((c) => c.status !== "cancelado")
  const sum = (rows: typeof charges) => rows.reduce((n, c) => n + c.amount_cents, 0)
  const tiles = [
    { label: "Previsto", value: sum(active), hint: plural(active.length, "mensalidade", "mensalidades") },
    { label: "Recebido", value: sum(active.filter((c) => c.status === "pago")), hint: plural(active.filter((c) => c.status === "pago").length, "paga", "pagas") },
    { label: "A vencer", value: sum(active.filter((c) => c.effective_status === "pendente")), hint: "ainda no prazo" },
    { label: "Em atraso", value: sum(active.filter((c) => c.effective_status === "vencido")), hint: plural(active.filter((c) => c.effective_status === "vencido").length, "mensalidade", "mensalidades"), alert: true },
  ]
  const count = (id: (typeof FILTERS)[number]["id"]) =>
    id === "todas" ? charges.length : id === "hoje" ? charges.filter((c) => c.effective_status === "pendente" && c.due_date === today).length : charges.filter((c) => c.effective_status === id).length
  const shown =
    filter === "todas"
      ? [...charges].sort((a, b) => order(a) - order(b) || a.due_date.localeCompare(b.due_date))
      : filter === "hoje"
        ? charges.filter((c) => c.effective_status === "pendente" && c.due_date === today)
        : charges.filter((c) => c.effective_status === filter)
  const href = (patch: { mes?: string; filtro?: string }) => {
    const p = new URLSearchParams()
    const mes = patch.mes ?? month
    const f = patch.filtro ?? filter
    if (mes !== today.slice(0, 7)) p.set("mes", mes)
    if (f !== "todas") p.set("filtro", f)
    const q = p.toString()
    return q ? `/financeiro?${q}` : "/financeiro"
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Mensalidades do mês. Cobre pelo WhatsApp e confirme quando o aluno pagar."
        actions={
          <Button asChild variant="outline" size="lg">
            <Link href="/financeiro/relatorios">
              <BarChart3 aria-hidden /> Relatórios
            </Link>
          </Button>
        }
      />

      {!pixReady(settings) && (
        <Link href="/configuracoes#pix" className="mb-5 block rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          Cadastre a chave Pix em Configurações para o Pix copia e cola ir junto na cobrança.
        </Link>
      )}

      <div className="mb-5 flex items-center gap-2">
        <Link href={href({ mes: shiftMonth(month, -1) })} aria-label="Mês anterior" className="grid size-tap-lg place-items-center rounded-full border border-input bg-card">
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <p className="flex-1 text-center font-display text-2xl font-bold uppercase">{competenceLabel(`${month}-01`)}</p>
        <Link href={href({ mes: shiftMonth(month, 1) })} aria-label="Próximo mês" className="grid size-tap-lg place-items-center rounded-full border border-input bg-card">
          <ChevronRight className="size-6" aria-hidden />
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={cn("grid gap-1 rounded-xl border bg-card p-4", t.alert && t.value ? "border-destructive/30" : "border-border")}>
            <span className="text-sm font-semibold text-muted-foreground">{t.label}</span>
            <span className={cn("text-2xl font-bold", t.alert && t.value ? "text-destructive" : "")}>{formatBRL(t.value)}</span>
            <span className="text-sm text-muted-foreground">{t.hint}</span>
          </div>
        ))}
      </div>

      <nav aria-label="Filtrar mensalidades" className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {FILTERS.filter((f) => f.id === "todas" || f.id === filter || count(f.id)).map((f) => (
          <Link
            key={f.id}
            href={href({ filtro: f.id })}
            aria-current={filter === f.id ? "page" : undefined}
            className={cn(
              "flex min-h-tap shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold",
              filter === f.id ? "border-foreground bg-foreground text-background" : "border-input bg-card",
            )}
          >
            {f.label}
            <span className={cn("rounded-full px-1.5 text-xs", filter === f.id ? "bg-background/20" : "bg-secondary")}>{count(f.id)}</span>
          </Link>
        ))}
      </nav>

      <ChargeList
        key={`${month}-${filter}`}
        charges={shown}
        emptyText={charges.length ? "Nenhuma mensalidade com esse filtro." : "Nenhuma mensalidade neste mês. Elas aparecem para alunos ativos com valor definido."}
      />
    </>
  )
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// Atrasadas primeiro, depois vencendo, a vencer, pagas e canceladas.
function order(c: { effective_status: string }) {
  return { vencido: 0, pendente: 1, pago: 2, cancelado: 3 }[c.effective_status] ?? 4
}
