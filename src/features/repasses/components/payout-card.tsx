"use client"

import { Check, ChevronDown, Undo2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { StaffAvatar } from "@/components/brand/staff-avatar"
import { ActionSheet } from "@/components/feedback/action-sheet"
import { toastWithUndo } from "@/components/feedback/undo-toast"
import { centsToMoneyInput, ChipToggle, MoneyField, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { PAYMENT_METHOD_LABEL } from "@/features/financeiro/lib"
import { todaySP } from "@/lib/dates"
import { firstName, formatBRL, formatDate } from "@/lib/format"
import type { Enums } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"
import { maskDate, parseMoneyToCents } from "@/lib/validation"

import { markPayoutPaid, undoPayout } from "../actions"
import type { PayoutLine, PayoutRow } from "../queries"

type Method = Enums<"payment_method">

export function PayoutCard({ row, lines, month, closed }: { row: PayoutRow; lines: PayoutLine[]; month: string; closed: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [, start] = useTransition()
  const paid = row.paid_amount_cents !== null
  const difference = paid ? row.total_cents - (row.paid_amount_cents ?? 0) : 0
  const studio = row.base_cents - row.commission_cents

  return (
    <article className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <header className="flex items-center gap-3">
        <StaffAvatar name={row.full_name} url={row.avatar_url} size={48} />
        <div className="grid flex-1">
          <span className="font-display text-xl leading-tight font-bold uppercase">{row.full_name}</span>
          <span className="text-sm text-muted-foreground">Comissão {row.current_rate_bp / 100}%</span>
        </div>
        {paid ? (
          <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-sm font-semibold text-success">Pago</span>
        ) : (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-sm font-semibold">{closed ? "A pagar" : "Parcial"}</span>
        )}
      </header>

      <dl className="grid gap-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Pago pelos alunos</dt>
          <dd className="font-semibold tabular-nums">{formatBRL(row.base_cents)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Comissão</dt>
          <dd className="font-semibold tabular-nums">{formatBRL(row.commission_cents)}</dd>
        </div>
        {row.bonus_cents > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Bônus de campanha</dt>
            <dd className="font-semibold tabular-nums text-brand-ink">+ {formatBRL(row.bonus_cents)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-border pt-2 text-base">
          <dt className="font-semibold">Total do repasse</dt>
          <dd className="font-bold tabular-nums">{formatBRL(row.total_cents)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Parte do estúdio</dt>
          <dd className="tabular-nums text-muted-foreground">{formatBRL(studio)}</dd>
        </div>
      </dl>

      {paid && (
        <p className="rounded-lg bg-success-soft px-3 py-2 text-sm font-medium text-success">
          Pago {formatBRL(row.paid_amount_cents ?? 0)} em {formatDate(row.paid_on!)}
          {row.payment_method && ` · ${PAYMENT_METHOD_LABEL[row.payment_method]}`}
          {row.payout_note && ` · “${row.payout_note}”`}
        </p>
      )}
      {paid && difference !== 0 && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm font-medium text-warning">
          {difference > 0 ? `Diferença a pagar: ${formatBRL(difference)}` : `Pago a mais: ${formatBRL(-difference)}`} (pagamentos confirmados depois do repasse)
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {(!paid || difference > 0) && row.total_cents > 0 && (
          <Button onClick={() => setOpen(true)}>
            <Check aria-hidden /> {paid ? "Registrar diferença" : "Marcar como pago"}
          </Button>
        )}
        {paid && (
          <Button
            variant="outline"
            onClick={() =>
              start(async () => {
                const res = await undoPayout(row.personal_id, month)
                if (!res.ok) return void toast.error(res.message)
                toast.success("Repasse voltou para “a pagar”.")
                router.refresh()
              })
            }
          >
            <Undo2 aria-hidden /> Desfazer pagamento
          </Button>
        )}
        {lines.length > 0 && (
          <Button variant="ghost" aria-expanded={showDetails} onClick={() => setShowDetails((x) => !x)}>
            <ChevronDown className={cn("transition-transform", showDetails && "rotate-180")} aria-hidden />
            {showDetails ? "Esconder alunos" : `Ver ${lines.length} ${lines.length === 1 ? "pagamento" : "pagamentos"}`}
          </Button>
        )}
      </div>

      {showDetails && (
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">
          {lines.map((l) => (
            <li key={l.charge_id} className="flex items-center gap-3 px-3 py-2">
              <span className="grid flex-1">
                <span className="font-medium">{l.student_name}</span>
                <span className="text-xs text-muted-foreground">
                  pago em {formatDate(l.paid_on)} · {formatBRL(l.amount_cents)}
                </span>
              </span>
              <span className="text-right tabular-nums">
                {l.bonus_cents > 0 ? (
                  <span className="font-semibold text-brand-ink">Bônus {formatBRL(l.bonus_cents)}</span>
                ) : (
                  <span className="font-semibold">
                    {formatBRL(l.commission_cents)} <span className="text-xs font-normal text-muted-foreground">({l.rate_bp / 100}%)</span>
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <PaySheet
          name={row.full_name}
          defaultCents={paid ? difference : row.total_cents}
          alreadyPaid={paid ? (row.paid_amount_cents ?? 0) : 0}
          onClose={() => setOpen(false)}
          onSubmit={async (input) => {
            const res = await markPayoutPaid(row.personal_id, month, input)
            if (!res.ok) return res.message
            setOpen(false)
            router.refresh()
            toastWithUndo(`Repasse de ${firstName(row.full_name)} registrado: ${formatBRL(input.amountCents)}.`, async () => {
              if (paid) return
              if ((await undoPayout(row.personal_id, month)).ok) router.refresh()
            })
            return null
          }}
        />
      )}
    </article>
  )
}

function PaySheet({
  name,
  defaultCents,
  alreadyPaid,
  onClose,
  onSubmit,
}: {
  name: string
  defaultCents: number
  alreadyPaid: number
  onClose: () => void
  onSubmit: (input: { amountCents: number; paidOn: string; method: Method; note: string }) => Promise<string | null>
}) {
  const [amount, setAmount] = useState(centsToMoneyInput(defaultCents))
  const [paidOn, setPaidOn] = useState(formatDate(todaySP()))
  const [method, setMethod] = useState<Method>("pix")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const cents = parseMoneyToCents(amount) ?? 0
  return (
    <ActionSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Pagar repasse"
      description={alreadyPaid ? `${name} · já pago ${formatBRL(alreadyPaid)} neste mês` : name}
      submitLabel={`Registrar ${formatBRL(alreadyPaid + cents)}`}
      pending={pending}
      error={error}
      onSubmit={() =>
        start(async () => {
          const msg = await onSubmit({ amountCents: alreadyPaid + cents, paidOn, method, note })
          if (msg) setError(msg)
        })
      }
    >
      <MoneyField id="payout_amount" label={alreadyPaid ? "Diferença paga agora" : "Valor pago"} value={amount} onChange={setAmount} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">Como pagou</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["pix", "dinheiro", "outro"] as Method[]).map((m) => (
            <ChipToggle key={m} big pressed={method === m} onPressedChange={() => setMethod(m)}>
              {m === "outro" ? "Outro" : PAYMENT_METHOD_LABEL[m]}
            </ChipToggle>
          ))}
        </div>
      </fieldset>
      <TextField id="payout_date" label="Pago em" value={paidOn} onChange={setPaidOn} mask={maskDate} inputMode="numeric" className="[&_input]:max-w-40" />
      <TextField id="payout_note" label="Observação (opcional)" value={note} onChange={setNote} />
    </ActionSheet>
  )
}
