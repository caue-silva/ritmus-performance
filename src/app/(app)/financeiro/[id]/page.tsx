import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ChargeActions } from "@/features/financeiro/components/charge-actions"
import { ChargeManage } from "@/features/financeiro/components/charge-manage"
import { ChargeStatusBadge } from "@/features/financeiro/components/charge-status"
import { PixBox } from "@/features/financeiro/components/pix-box"
import { competenceLabel, PAYMENT_METHOD_LABEL } from "@/features/financeiro/lib"
import { getCharge } from "@/features/financeiro/queries"
import { requireAdmin } from "@/lib/auth"
import { formatBRL, formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Mensalidade" }

const ACTION_LABEL: Record<string, string> = {
  criada: "Mensalidade gerada",
  valor_ajustado: "Valor ajustado",
  vencimento_ajustado: "Vencimento ajustado",
  paga: "Pagamento confirmado",
  pagamento_desfeito: "Pagamento desfeito",
  cancelada: "Mensalidade cancelada",
  reaberta: "Mensalidade reaberta",
}

function describe(action: string, oldV: unknown, newV: unknown) {
  const money = (v: unknown) => (typeof v === "number" ? formatBRL(v) : "")
  const date = (v: unknown) => (typeof v === "string" ? formatDate(v) : "")
  if (action === "valor_ajustado") return `${money(oldV)} → ${money(newV)}`
  if (action === "vencimento_ajustado") return `${date(oldV)} → ${date(newV)}`
  if (action === "paga" && newV && typeof newV === "object") {
    const n = newV as { paid_on?: string; payment_method?: keyof typeof PAYMENT_METHOD_LABEL; note?: string }
    return [n.payment_method && PAYMENT_METHOD_LABEL[n.payment_method], n.paid_on && `em ${formatDate(n.paid_on)}`, n.note].filter(Boolean).join(" · ")
  }
  if (action === "cancelada" && newV && typeof newV === "object") return (newV as { note?: string }).note ?? ""
  if (action === "criada" && newV && typeof newV === "object") {
    const n = newV as { amount_cents?: number; due_date?: string }
    return `${money(n.amount_cents)} · vence ${date(n.due_date)}`
  }
  return ""
}

export default async function ChargePage({ params }: PageProps<"/financeiro/[id]">) {
  await requireAdmin()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const result = await getCharge(id)
  if (!result) notFound()
  const { charge: c, events } = result

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div>
        <Button asChild variant="ghost" className="-ml-3 mb-2">
          <Link href={`/financeiro?mes=${c.competence.slice(0, 7)}`}>
            <ArrowLeft /> Financeiro
          </Link>
        </Button>
        <p className="text-muted-foreground">{competenceLabel(c.competence)}</p>
        <h1 className="font-display text-3xl font-bold uppercase md:text-4xl">
          <Link href={`/alunos/${c.student_id}`} className="underline-offset-4 hover:underline">
            {c.full_name}
          </Link>
        </h1>
      </div>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-5xl font-bold">{formatBRL(c.amount_cents)}</p>
            <p className="text-muted-foreground">Vence {formatDate(c.due_date)}</p>
          </div>
          <ChargeStatusBadge status={c.effective_status} daysOverdue={c.days_overdue} className="text-base" />
        </div>
        {c.effective_status === "pago" && (
          <p className="rounded-lg bg-success-soft px-4 py-3 font-medium text-success">
            Pago em {formatDate(c.paid_on!)}
            {c.payment_method && ` · ${PAYMENT_METHOD_LABEL[c.payment_method]}`}
            {c.payment_note && ` · “${c.payment_note}”`}
          </p>
        )}
        {c.effective_status === "cancelado" && c.canceled_reason && <p className="text-muted-foreground">Motivo: {c.canceled_reason}</p>}
        <ChargeActions charge={c} layout="stack" />
      </section>

      {c.pix && (
        <section className="grid gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-bold uppercase">Pix desta mensalidade</h2>
          <p className="text-sm text-muted-foreground">
            O aluno pode escanear o QR Code aqui no estúdio ou colar o código no app do banco. Depois, confirme o pagamento.
          </p>
          <PixBox payload={c.pix} />
        </section>
      )}

      <ChargeManage charge={c} />

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-bold uppercase">Histórico</h2>
        <ol className="grid gap-2 border-l-2 border-border pl-4">
          {events.map((e) => (
            <li key={e.id} className="grid gap-0.5">
              <span className="font-semibold">{ACTION_LABEL[e.action] ?? e.action}</span>
              <span className="text-sm text-muted-foreground">
                {[
                  describe(e.action, e.old_value, e.new_value),
                  new Date(e.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }),
                  e.actor?.full_name ? `por ${e.actor.full_name.split(" ")[0]}` : "pelo sistema",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
