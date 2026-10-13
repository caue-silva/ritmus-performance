"use client"

import { CloudOff, Loader2 } from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { toastWithUndo } from "@/components/feedback/undo-toast"
import { Textarea } from "@/components/ui/textarea"
import { updateStudentHeight } from "@/features/alunos/actions"
import { formatDate, firstName } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { parseDecimal, parseHeightCm } from "@/lib/validation"

import { bmi, bmiLabel, formatNumber } from "../lib"
import { discardMeasurement, saveMeasurement } from "../offline-queue"

type Last = { measured_at: string | null; weight_kg: number | null; waist_cm: number | null; abdomen_cm: number | null; height_cm: number | null }

const FIELDS = [
  { id: "weight_kg", label: "Peso", unit: "kg", min: 20, max: 300 },
  { id: "waist_cm", label: "Cintura", unit: "cm", min: 30, max: 250 },
  { id: "abdomen_cm", label: "Abdômen", unit: "cm", min: 30, max: 250 },
] as const

type FieldId = (typeof FIELDS)[number]["id"]

/** Registrar medição: pensado para o meio da aula — três números e um toque. */
export function MeasurementSheet({
  student,
  sessionId,
  canEditHeight,
  onClose,
  onSaved,
}: {
  student: { id: string; full_name: string }
  sessionId: string | null
  canEditHeight: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [last, setLast] = useState<Last | null>(null)
  const [values, setValues] = useState<Record<FieldId, string>>({ weight_kg: "", waist_cm: "", abdomen_cm: "" })
  const [notes, setNotes] = useState("")
  const [height, setHeight] = useState("")
  const [editHeight, setEditHeight] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldId | "form" | "height", string>>>({})
  const [pending, start] = useTransition()
  const first = firstName(student.full_name)

  useEffect(() => {
    let alive = true
    createClient()
      .rpc("last_measurement", { p_student_id: student.id, p_session_id: sessionId ?? undefined })
      .then(({ data }) => {
        if (!alive) return
        const row = (data?.[0] ?? null) as Last | null
        setLast(row)
        if (row?.height_cm) setHeight(formatNumber(row.height_cm / 100, 2))
      })
    return () => {
      alive = false
    }
  }, [student.id, sessionId])

  const heightCm = editHeight ? parseHeightCm(height) : (last?.height_cm ?? null)
  const weight = parseDecimal(values.weight_kg)
  const liveBmi = bmi(weight, heightCm)

  const submit = () => {
    const errs: typeof errors = {}
    const parsed: Record<FieldId, number | null> = { weight_kg: null, waist_cm: null, abdomen_cm: null }
    for (const f of FIELDS) {
      const raw = values[f.id].trim()
      if (!raw) continue
      const n = parseDecimal(raw)
      if (n === null || n < f.min || n > f.max) errs[f.id] = `Confira o valor (entre ${f.min} e ${f.max} ${f.unit}).`
      else parsed[f.id] = n
    }
    if (!Object.keys(errs).length && parsed.weight_kg === null && parsed.waist_cm === null && parsed.abdomen_cm === null && !notes.trim()) {
      errs.form = "Preencha pelo menos uma medida."
    }
    if (editHeight && (!heightCm || heightCm < 100 || heightCm > 250)) errs.height = "Altura em metros, ex.: 1,72."
    setErrors(errs)
    if (Object.keys(errs).length) return

    start(async () => {
      if (editHeight && heightCm && heightCm !== last?.height_cm) {
        const h = await updateStudentHeight(student.id, heightCm)
        if (!h.ok) toast.error(`Altura não salva: ${h.message}`)
      }
      const res = await saveMeasurement({
        student_id: student.id,
        student_name: student.full_name,
        session_id: sessionId,
        measured_at: new Date().toISOString(),
        ...parsed,
        notes: notes.trim() || null,
      })
      if (res.status === "erro") return setErrors({ form: res.error })
      onClose()
      if (res.status === "pendente") {
        // Sem conexão não adianta atualizar a tela pelo servidor (a navegação travaria).
        // O reenvio automático atualiza quando a medição chegar.
        toast.warning(`Sem internet: a medição de ${first} ficou guardada no aparelho e vai ser enviada assim que a conexão voltar.`, {
          icon: <CloudOff className="size-4" />,
          duration: 6000,
        })
        return
      }
      onSaved?.()
      toastWithUndo(`Medição de ${first} salva.`, async () => {
        const { error } = await createClient().from("measurements").delete().eq("client_id", res.clientId)
        discardMeasurement(res.clientId)
        if (error) toast.error("Não deu para desfazer. Apague pelo histórico do aluno.")
        onSaved?.()
      })
    })
  }

  const ref = (id: FieldId) => {
    const v = last?.[id]
    return v ? `Última: ${formatNumber(v)} ${FIELDS.find((f) => f.id === id)!.unit}` : null
  }

  return (
    <ActionSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Medir ${first}`}
      description={last?.measured_at ? `Última medição em ${formatDate(last.measured_at)}` : "Primeira medição na aula"}
      submitLabel="Salvar medição"
      onSubmit={submit}
      pending={pending}
      error={errors.form}
    >
      {FIELDS.map((f, i) => (
        <div key={f.id} className="grid gap-1">
          <label htmlFor={`m-${f.id}`} className="flex items-baseline justify-between text-sm font-semibold">
            {f.label}
            {ref(f.id) && <span className="font-normal text-muted-foreground">{ref(f.id)}</span>}
          </label>
          <div className="relative">
            <input
              id={`m-${f.id}`}
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint={i < FIELDS.length - 1 ? "next" : "done"}
              placeholder={last?.[f.id] ? formatNumber(last[f.id]!) : "0,0"}
              value={values[f.id]}
              onChange={(e) => {
                setValues((v) => ({ ...v, [f.id]: e.target.value.replace(/[^\d,.]/g, "") }))
                setErrors((x) => ({ ...x, [f.id]: undefined, form: undefined }))
              }}
              aria-invalid={Boolean(errors[f.id])}
              aria-describedby={errors[f.id] ? `m-${f.id}-error` : undefined}
              data-autofocus={i === 0 ? true : undefined}
              className={cn(
                "h-16 w-full rounded-xl border-2 bg-card px-4 pr-14 font-display text-3xl font-bold outline-none placeholder:text-muted-foreground/40 focus-visible:border-foreground",
                errors[f.id] ? "border-destructive" : "border-input",
              )}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lg font-semibold text-muted-foreground">
              {f.unit}
            </span>
          </div>
          {errors[f.id] && (
            <p id={`m-${f.id}-error`} role="alert" className="text-sm font-medium text-destructive">
              {errors[f.id]}
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-4 py-3" aria-live="polite">
        <span className="text-sm">
          {liveBmi ? (
            <>
              <span className="font-semibold">IMC {formatNumber(liveBmi)}</span>
              <span className="text-muted-foreground"> · {bmiLabel(liveBmi)}</span>
            </>
          ) : heightCm ? (
            <span className="text-muted-foreground">Digite o peso para ver o IMC</span>
          ) : (
            <span className="text-muted-foreground">Sem altura no cadastro: o IMC não é calculado</span>
          )}
        </span>
        {canEditHeight && !editHeight && (
          <button type="button" onClick={() => setEditHeight(true)} className="min-h-tap text-sm font-semibold text-brand-ink underline-offset-4 hover:underline">
            {heightCm ? `Altura ${formatNumber(heightCm / 100, 2)} m · alterar` : "Informar altura"}
          </button>
        )}
      </div>
      {editHeight && (
        <div className="grid gap-1">
          <label htmlFor="m-height" className="text-sm font-semibold">
            Altura (m)
          </label>
          <input
            id="m-height"
            inputMode="decimal"
            value={height}
            onChange={(e) => setHeight(e.target.value.replace(/[^\d,.]/g, ""))}
            placeholder="1,70"
            className="h-12 w-40 rounded-lg border border-input bg-card px-3 text-lg"
            aria-invalid={Boolean(errors.height)}
          />
          {errors.height && <p className="text-sm font-medium text-destructive">{errors.height}</p>}
        </div>
      )}

      <div className="grid gap-1.5">
        <label htmlFor="m-notes" className="text-sm font-semibold">
          Observações (opcional)
        </label>
        <Textarea id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: reclamou de dor no ombro" rows={2} />
      </div>
      {pending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Salvando…
        </p>
      )}
    </ActionSheet>
  )
}
