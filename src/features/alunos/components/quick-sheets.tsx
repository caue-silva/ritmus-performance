"use client"

import { useState, useTransition } from "react"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { toastWithUndo } from "@/components/feedback/undo-toast"
import { centsToMoneyInput, MoneyField, TextField } from "@/components/form/fields"
import { formatBRL, formatDate } from "@/lib/format"
import { todaySP } from "@/lib/dates"
import { maskDate, parseMoneyToCents } from "@/lib/validation"

import { registerClearance, setMonthlyFee, undoClearance } from "../actions"

type Base = {
  studentId: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
  onUndone?: () => void
}

/** Registrar "liberação médica recebida em dd/mm" (sem arquivo: o documento fica com o Gabriel). */
export function ClearanceSheet({ studentId, name, open, onOpenChange, onDone, onUndone }: Base) {
  const [date, setDate] = useState(formatDate(todaySP()))
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const first = name.split(" ")[0]

  const submit = () =>
    start(async () => {
      const res = await registerClearance(studentId, date)
      if (!res.ok) return setError(res.fieldErrors?.date ?? res.message)
      onOpenChange(false)
      onDone?.()
      toastWithUndo(`Liberação de ${first} registrada.`, async () => {
        if ((await undoClearance(studentId)).ok) onUndone?.()
      })
    })

  return (
    <ActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Liberação médica"
      description={`${name} respondeu “sim” no PAR-Q. Registre quando você recebeu a liberação do médico.`}
      submitLabel="Registrar liberação"
      onSubmit={submit}
      pending={pending}
    >
      <TextField
        id="clearance_date"
        label="Recebida em"
        value={date}
        onChange={(v) => {
          setDate(v)
          setError(undefined)
        }}
        mask={maskDate}
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        error={error}
        hint="Guarde o documento com você: o sistema registra só a data."
        className="max-w-56"
      />
    </ActionSheet>
  )
}

/** Definir (ou mudar) o valor da mensalidade. */
export function FeeSheet({
  studentId,
  name,
  open,
  onOpenChange,
  onDone,
  onUndone,
  currentFee,
  frequency,
  referenceFees,
}: Base & { currentFee: number | null; frequency: number | null; referenceFees: Record<string, number> }) {
  const [fee, setFee] = useState(centsToMoneyInput(currentFee))
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const suggestion = frequency ? referenceFees[String(frequency)] : undefined

  const submit = () => {
    const cents = parseMoneyToCents(fee)
    if (!cents) return setError("Digite o valor combinado.")
    start(async () => {
      const res = await setMonthlyFee(studentId, cents)
      if (!res.ok) return setError(res.message)
      onOpenChange(false)
      onDone?.()
      toastWithUndo(`Mensalidade de ${name.split(" ")[0]}: ${formatBRL(cents)}.`, async () => {
        if ((await setMonthlyFee(studentId, res.data.previousFee)).ok) onUndone?.()
      })
    })
  }

  return (
    <ActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Valor da mensalidade"
      description={name}
      submitLabel="Salvar valor"
      onSubmit={submit}
      pending={pending}
    >
      <MoneyField
        id="fee"
        label="Valor mensal combinado"
        value={fee}
        onChange={(v) => {
          setFee(v)
          setError(undefined)
        }}
        error={error}
        autoFocus
      />
      {suggestion && parseMoneyToCents(fee) !== suggestion && (
        <button
          type="button"
          onClick={() => setFee(centsToMoneyInput(suggestion))}
          className="min-h-tap justify-self-start rounded-full bg-brand-soft px-4 text-sm font-semibold text-brand-ink"
        >
          Usar referência de {frequency}x: {formatBRL(suggestion)}
        </button>
      )}
    </ActionSheet>
  )
}
