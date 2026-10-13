"use client"

import { useMemo, useState, useTransition } from "react"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { toastWithUndo } from "@/components/feedback/undo-toast"
import { centsToMoneyInput, ChipToggle, MoneyField, TextField } from "@/components/form/fields"
import { formatBRL } from "@/lib/format"
import { parseMoneyToCents } from "@/lib/validation"

import { activateStudent, undoActivation } from "../actions"
import type { ActivationOptions } from "../queries"
import { SlotPicker } from "./slot-picker"

export type ActivationTarget = {
  id: string
  full_name: string
  personal_id: string | null
  weekly_frequency: number | null
  fee_cents: number | null
  due_day: number | null
}

const FREQUENCIES = [1, 2, 3, 4, 5]

export function ActivationSheet({
  target,
  options,
  open,
  onOpenChange,
  onActivated,
  onUndone,
}: {
  target: ActivationTarget
  options: ActivationOptions
  open: boolean
  onOpenChange: (open: boolean) => void
  onActivated?: () => void
  onUndone?: () => void
}) {
  const [personalId, setPersonalId] = useState(target.personal_id ?? "")
  const [frequency, setFrequency] = useState(target.weekly_frequency ?? 0)
  const [slotIds, setSlotIds] = useState<string[]>([])
  const [fee, setFee] = useState(centsToMoneyInput(target.fee_cents))
  const [dueDay, setDueDay] = useState(String(target.due_day ?? 10))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, startTransition] = useTransition()

  const slots = useMemo(() => options.slots.filter((s) => s.personal_id === personalId), [options.slots, personalId])
  const suggestion = frequency ? options.referenceFees[String(frequency)] : undefined

  const submit = () => {
    const errs: Record<string, string> = {}
    if (!personalId) errs.personal = "Escolha o personal responsável."
    if (!frequency) errs.frequency = "Escolha quantas vezes por semana."
    const day = Number(dueDay)
    if (!Number.isInteger(day) || day < 1 || day > 31) errs.due_day = "Dia entre 1 e 31."
    setErrors(errs)
    if (Object.keys(errs).length) return
    setFormError(undefined)

    startTransition(async () => {
      const res = await activateStudent({
        studentId: target.id,
        personalId,
        weeklyFrequency: frequency,
        slotIds,
        feeCents: parseMoneyToCents(fee),
        dueDay: day,
      })
      if (!res.ok) {
        setFormError(res.message)
        if (res.fieldErrors) setErrors(res.fieldErrors)
        return
      }
      onOpenChange(false)
      onActivated?.()
      toastWithUndo(`${target.full_name.split(" ")[0]} está ativo.`, async () => {
        const undo = await undoActivation(target.id, res.data.enrollmentIds, res.data.previousStatus)
        if (undo.ok) onUndone?.()
      })
    })
  }

  return (
    <ActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Ativar ${target.full_name.split(" ")[0]}`}
      description={target.full_name}
      submitLabel="Ativar aluno"
      onSubmit={submit}
      pending={pending}
      error={formError}
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">Personal responsável</legend>
        <div className="flex flex-wrap gap-2">
          {options.staff.map((p) => (
            <ChipToggle
              key={p.id}
              pressed={personalId === p.id}
              onPressedChange={() => {
                setPersonalId(p.id)
                setSlotIds([])
              }}
            >
              {p.full_name.split(" ")[0]}
            </ChipToggle>
          ))}
        </div>
        {errors.personal && <FieldError>{errors.personal}</FieldError>}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">Vezes por semana</legend>
        <div className="grid grid-cols-5 gap-2">
          {FREQUENCIES.map((f) => (
            <ChipToggle key={f} pressed={frequency === f} onPressedChange={() => setFrequency(f)}>
              {f}x
            </ChipToggle>
          ))}
        </div>
        {errors.frequency && <FieldError>{errors.frequency}</FieldError>}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">Horários fixos</legend>
        {!personalId ? (
          <p className="text-sm text-muted-foreground">Escolha o personal para ver os horários dele.</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esse personal ainda não tem horários. Dá para ativar agora e escolher os horários depois.
          </p>
        ) : (
          <SlotPicker slots={slots} selected={slotIds} onChange={setSlotIds} frequency={frequency} />
        )}
      </fieldset>

      <div className="grid gap-2">
        <MoneyField
          id="fee"
          label="Valor mensal combinado"
          value={fee}
          onChange={setFee}
          hint="Se ainda não combinou, deixe em branco: vira uma tarefa para depois."
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
      </div>

      <TextField
        id="due_day"
        label="Dia do vencimento"
        value={dueDay}
        onChange={(v) => setDueDay(v.replace(/\D/g, "").slice(0, 2))}
        inputMode="numeric"
        error={errors.due_day}
        hint="O aluno escolheu esse dia no cadastro. Ajuste se precisar."
        className="[&_input]:max-w-32"
      />
    </ActionSheet>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {children}
    </p>
  )
}
