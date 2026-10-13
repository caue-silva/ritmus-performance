"use client"

import { Ban, Pencil, RotateCcw, Undo2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { centsToMoneyInput, MoneyField, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { maskDate, parseMoneyToCents } from "@/lib/validation"

import { adjustCharge, cancelCharge, reopenCharge, undoPayment } from "../actions"
import type { EffectiveStatus } from "../lib"

/** Ações menos frequentes da mensalidade: ajustar, cancelar, reabrir, desfazer pagamento. */
export function ChargeManage({
  charge,
}: {
  charge: { id: string; amount_cents: number; due_date: string; effective_status: EffectiveStatus }
}) {
  const router = useRouter()
  const [open, setOpen] = useState<"ajustar" | "cancelar" | null>(null)
  const [amount, setAmount] = useState(centsToMoneyInput(charge.amount_cents))
  const [due, setDue] = useState(formatDate(charge.due_date))
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, start] = useTransition()
  const pendingStatus = charge.effective_status === "pendente" || charge.effective_status === "vencido"

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) return void toast.error(res.message)
      toast.success(success)
      router.refresh()
    })

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {pendingStatus && (
          <>
            <Button variant="outline" onClick={() => setOpen("ajustar")}>
              <Pencil aria-hidden /> Ajustar valor ou vencimento
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={() => setOpen("cancelar")}>
              <Ban aria-hidden /> Cancelar mensalidade
            </Button>
          </>
        )}
        {charge.effective_status === "pago" && (
          <Button variant="outline" disabled={pending} onClick={() => run(() => undoPayment(charge.id), "Pagamento desfeito: a mensalidade voltou a ficar pendente.")}>
            <Undo2 aria-hidden /> Desfazer pagamento
          </Button>
        )}
        {charge.effective_status === "cancelado" && (
          <Button variant="outline" disabled={pending} onClick={() => run(() => reopenCharge(charge.id), "Mensalidade reaberta.")}>
            <RotateCcw aria-hidden /> Reabrir mensalidade
          </Button>
        )}
      </div>

      <ActionSheet
        open={open === "ajustar"}
        onOpenChange={(o) => !o && setOpen(null)}
        title="Ajustar mensalidade"
        description="Muda só esta mensalidade. O valor das próximas fica na ficha do aluno. Fica registrado quem alterou."
        submitLabel="Salvar ajuste"
        pending={pending}
        error={formError}
        onSubmit={() =>
          start(async () => {
            const res = await adjustCharge(charge.id, { amountCents: parseMoneyToCents(amount) ?? 0, dueDate: due })
            if (!res.ok) {
              setErrors(res.fieldErrors ?? {})
              setFormError(res.fieldErrors ? undefined : res.message)
              return
            }
            setOpen(null)
            toast.success("Mensalidade ajustada.")
            router.refresh()
          })
        }
      >
        <MoneyField id="amount" label="Valor" value={amount} onChange={setAmount} error={errors.amount} />
        <TextField id="due" label="Vencimento" value={due} onChange={setDue} mask={maskDate} inputMode="numeric" error={errors.due} className="[&_input]:max-w-40" />
      </ActionSheet>

      <ActionSheet
        open={open === "cancelar"}
        onOpenChange={(o) => !o && setOpen(null)}
        title="Cancelar mensalidade"
        description="Ela sai das cobranças e dos relatórios de previsto. Dá para reabrir depois."
        submitLabel="Cancelar esta mensalidade"
        pending={pending}
        onSubmit={() =>
          start(async () => {
            const res = await cancelCharge(charge.id, reason)
            if (!res.ok) return setFormError(res.message)
            setOpen(null)
            toast.success("Mensalidade cancelada.")
            router.refresh()
          })
        }
        error={formError}
      >
        <TextField id="reason" label="Motivo (opcional)" value={reason} onChange={setReason} placeholder="Ex.: mês de férias combinado" />
      </ActionSheet>
    </>
  )
}
