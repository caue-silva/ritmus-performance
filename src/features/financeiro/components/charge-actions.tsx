"use client"

import { Check, MessageCircle } from "lucide-react"
import { useState, useTransition } from "react"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { toastWithUndo } from "@/components/feedback/undo-toast"
import { ChipToggle, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { todaySP } from "@/lib/dates"
import { firstName, formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { maskDate } from "@/lib/validation"

import { confirmPayment, undoPayment, type PaymentMethod } from "../actions"
import { PAYMENT_METHOD_LABEL, type EffectiveStatus } from "../lib"

export type ChargeActionTarget = {
  id: string
  full_name: string
  amount_cents: number
  due_date: string
  effective_status: EffectiveStatus
  whatsapp_url: string
}

/** Cobrar no WhatsApp (1 toque) + Confirmar pagamento (2 toques), com Desfazer. */
export function ChargeActions({
  charge,
  onConfirmed,
  onUndone,
  layout = "row",
}: {
  charge: ChargeActionTarget
  onConfirmed?: () => void
  onUndone?: () => void
  layout?: "row" | "stack"
}) {
  const [open, setOpen] = useState(false)
  if (charge.effective_status !== "pendente" && charge.effective_status !== "vencido") return null
  return (
    <>
      <div className={cn("grid gap-2", layout === "row" ? "grid-cols-2" : "grid-cols-1")}>
        <Button asChild variant="dark">
          <a href={charge.whatsapp_url} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden /> Cobrar no WhatsApp
          </a>
        </Button>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Check aria-hidden /> Confirmar pagamento
        </Button>
      </div>
      {open && <ConfirmPaymentSheet charge={charge} onClose={() => setOpen(false)} onConfirmed={onConfirmed} onUndone={onUndone} />}
    </>
  )
}

export function ConfirmPaymentSheet({
  charge,
  onClose,
  onConfirmed,
  onUndone,
}: {
  charge: ChargeActionTarget
  onClose: () => void
  onConfirmed?: () => void
  onUndone?: () => void
}) {
  const [paidOn, setPaidOn] = useState(formatDate(todaySP()))
  const [method, setMethod] = useState<PaymentMethod>("pix")
  const [note, setNote] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, start] = useTransition()

  const submit = () =>
    start(async () => {
      const res = await confirmPayment(charge.id, { paidOn, method, note })
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.fieldErrors ? undefined : res.message)
        return
      }
      onClose()
      onConfirmed?.()
      toastWithUndo(`Pagamento de ${firstName(charge.full_name)} confirmado: ${formatBRL(charge.amount_cents)}.`, async () => {
        if ((await undoPayment(charge.id)).ok) onUndone?.()
      })
    })

  return (
    <ActionSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Confirmar pagamento"
      description={`${charge.full_name} · ${formatBRL(charge.amount_cents)} · venc. ${formatDate(charge.due_date)}`}
      submitLabel={`Confirmar ${formatBRL(charge.amount_cents)}`}
      onSubmit={submit}
      pending={pending}
      error={formError}
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">Como pagou</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
            <ChipToggle key={m} big pressed={method === m} onPressedChange={() => setMethod(m)}>
              {PAYMENT_METHOD_LABEL[m]}
            </ChipToggle>
          ))}
        </div>
      </fieldset>
      <TextField
        id="paid_on"
        label="Pago em"
        value={paidOn}
        onChange={(v) => {
          setPaidOn(v)
          setErrors((e) => ({ ...e, paidOn: "" }))
        }}
        mask={maskDate}
        inputMode="numeric"
        error={errors.paidOn}
        className="[&_input]:max-w-40"
      />
      <TextField id="payment_note" label="Observação (opcional)" value={note} onChange={setNote} placeholder="Ex.: pagou metade em dinheiro" />
    </ActionSheet>
  )
}
