"use client"

import { ArrowLeft, ArrowRight, Check, CloudOff, Loader2, PartyPopper, Send } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Logo } from "@/components/brand/logo"
import { FormAlert } from "@/components/feedback/form-field"
import { Button } from "@/components/ui/button"
import { todaySP } from "@/lib/dates"
import { maskCEP, maskCPF, maskDate, maskPhone, onlyDigits } from "@/lib/validation"
import { cn } from "@/lib/utils"

import { saveDraft, submitSignup } from "../actions"
import type { LegalDoc } from "../invite"
import { GOAL_OPTIONS, PARQ_QUESTIONS } from "../parq"
import { STEPS, stepOfField, validateField, validateStep, type Errors, type Field, type SignupDraft } from "../schema"
import { CheckRow, ChipToggle, TextField, YesNo } from "@/components/form/fields"

type SaveState = "idle" | "saving" | "saved" | "offline"

export function SignupWizard({
  token,
  firstName,
  initialDraft,
  initialStep,
  docs,
}: {
  token: string
  firstName: string
  initialDraft: SignupDraft
  initialStep: number
  docs: LegalDoc[]
}) {
  const [draft, setDraft] = useState(initialDraft)
  const [step, setStep] = useState(Math.min(initialStep, STEPS.length - 1))
  const [errors, setErrors] = useState<Errors>({})
  const [save, setSave] = useState<SaveState>("idle")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const [done, setDone] = useState(false)
  const [cepState, setCepState] = useState<"idle" | "loading" | "notfound">("idle")
  const topRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const today = todaySP()

  // Rascunho salvo automaticamente, com uma pequena espera depois de cada alteração.
  const scheduleSave = useCallback(
    (next: SignupDraft, nextStep: number) => {
      clearTimeout(saveTimer.current)
      setSave("saving")
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await saveDraft(token, next, nextStep)
          setSave(res.ok ? "saved" : "offline")
        } catch {
          setSave("offline")
        }
      }, 700)
    },
    [token],
  )
  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const update = <K extends Field>(field: K, value: SignupDraft[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      scheduleSave(next, step)
      // Erro some assim que o campo fica válido.
      if (errors[field] && !validateField(field, next, today)) {
        setErrors((e) => ({ ...e, [field]: undefined }))
      }
      return next
    })
  }

  const blur = (field: Field) => {
    const msg = validateField(field, draft, today)
    setErrors((e) => ({ ...e, [field]: msg }))
  }

  const focusFirstError = (errs: Errors) => {
    const first = (STEPS[step]!.fields as readonly Field[]).find((f) => errs[f])
    if (!first) return
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      ;(el?.matches("input,textarea,button") ? el : el?.querySelector<HTMLElement>("input,textarea,button"))?.focus({
        preventScroll: true,
      })
    })
  }

  const goTo = (next: number) => {
    setStep(next)
    setSubmitError(undefined)
    scheduleSave(draft, next)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  const next = () => {
    const errs = validateStep(step, draft, today)
    setErrors((e) => ({ ...e, ...errs }))
    if (Object.keys(errs).length) return focusFirstError(errs)
    goTo(step + 1)
  }

  const submit = async () => {
    const errs = validateStep(step, draft, today)
    setErrors((e) => ({ ...e, ...errs }))
    if (Object.keys(errs).length) return focusFirstError(errs)
    setSubmitting(true)
    setSubmitError(undefined)
    clearTimeout(saveTimer.current)
    try {
      const res = await submitSignup(
        token,
        draft,
        docs.map((d) => d.id),
      )
      if (res.ok) {
        setDone(true)
        window.scrollTo({ top: 0 })
        return
      }
      setSubmitError(res.message)
      if (res.errors && Object.keys(res.errors).length) {
        setErrors(res.errors)
        const firstStep = Math.min(...Object.keys(res.errors).map((f) => stepOfField(f as Field)).filter((i) => i >= 0))
        if (Number.isFinite(firstStep) && firstStep !== step) setStep(firstStep)
      }
    } catch {
      setSubmitError("Não conseguimos enviar agora. Confira sua internet e tente de novo — seus dados estão salvos.")
    } finally {
      setSubmitting(false)
    }
  }

  // CEP → endereço (ViaCEP), quando os 8 números estiverem digitados.
  const lookupCep = async (cep: string) => {
    const digits = onlyDigits(cep)
    if (digits.length !== 8) return
    setCepState("loading")
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
      if (data.erro) {
        setCepState("notfound")
        return
      }
      setCepState("idle")
      setDraft((prev) => {
        const next = {
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }
        scheduleSave(next, step)
        return next
      })
      setErrors((e) => ({ ...e, street: undefined, neighborhood: undefined, city: undefined, state: undefined }))
      requestAnimationFrame(() => document.getElementById("number")?.focus())
    } catch {
      setCepState("notfound")
    }
  }

  const doc = (kind: LegalDoc["kind"]) => docs.find((d) => d.kind === kind)
  const isLast = step === STEPS.length - 1
  const progress = ((step + 1) / STEPS.length) * 100

  if (done) {
    return (
      <div className="mx-auto grid max-w-lg justify-items-center gap-5 px-5 py-16 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-success-soft text-success">
          <PartyPopper className="size-10" aria-hidden />
        </span>
        <h1 className="font-display text-4xl font-bold uppercase">Cadastro enviado!</h1>
        <p className="text-lg text-muted-foreground">
          Valeu, {firstName}! O Gabriel vai conferir seus dados e confirmar seus horários pelo WhatsApp. Até o treino! 💪
        </p>
        <p className="text-sm text-muted-foreground">Você já pode fechar esta página.</p>
      </div>
    )
  }

  const text = (field: Field, label: string, props: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField
      id={field}
      label={label}
      value={draft[field] as string}
      error={errors[field]}
      onChange={(v) => update(field, v as never)}
      onBlur={() => blur(field)}
      {...props}
    />
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <header ref={topRef} className="dark sticky top-0 z-20 bg-sidebar pt-[env(safe-area-inset-top)] text-sidebar-foreground">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Logo size={40} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-bold uppercase">Cadastro Ritmus</p>
            <p className="text-sm text-sidebar-foreground/75">
              Etapa {step + 1} de {STEPS.length} · {STEPS[step]!.title}
            </p>
          </div>
          <SaveIndicator state={save} />
        </div>
        <div
          className="h-1.5 bg-sidebar-accent"
          role="progressbar"
          aria-label="Progresso do cadastro"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
        >
          <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-5 pt-6 pb-36">
        <h1 className="mb-1 font-display text-3xl font-bold uppercase">{STEPS[step]!.title}</h1>

        {step === 0 && (
          <div className="grid gap-5">
            <p className="text-muted-foreground">
              Oi, {firstName}! Leva uns 5 minutos. Se precisar parar, é só voltar neste link: o que você preencher fica salvo.
            </p>
            {text("full_name", "Nome completo", { autoComplete: "name", autoCapitalize: "words" })}
            {text("cpf", "CPF", { inputMode: "numeric", mask: maskCPF, placeholder: "000.000.000-00" })}
            {text("birth_date", "Data de nascimento", { inputMode: "numeric", mask: maskDate, placeholder: "dd/mm/aaaa", autoComplete: "bday" })}
            {text("whatsapp", "WhatsApp", { inputMode: "tel", mask: maskPhone, placeholder: "(15) 99999-9999", autoComplete: "tel-national" })}
            {text("email", "E-mail (opcional)", { inputMode: "email", type: "email", autoComplete: "email", autoCapitalize: "none" })}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5">
            <p className="text-muted-foreground">Digite o CEP que a gente completa o resto.</p>
            {text("cep", "CEP", {
              inputMode: "numeric",
              mask: maskCEP,
              placeholder: "00000-000",
              autoComplete: "postal-code",
              onValue: lookupCep,
              hint:
                cepState === "loading"
                  ? "Buscando endereço…"
                  : cepState === "notfound"
                    ? "Não achamos esse CEP. Confira ou preencha o endereço abaixo."
                    : undefined,
            })}
            {text("street", "Rua", { autoComplete: "address-line1" })}
            <div className="grid grid-cols-[7rem_1fr] gap-3">
              {text("number", "Número", { inputMode: "text" })}
              {text("complement", "Complemento", { placeholder: "Apto, bloco…" })}
            </div>
            {text("neighborhood", "Bairro")}
            <div className="grid grid-cols-[1fr_5rem] gap-3">
              {text("city", "Cidade", { autoComplete: "address-level2" })}
              {text("state", "UF", { autoCapitalize: "characters", maxLength: 2, autoComplete: "address-level1" })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5">
            <p className="text-muted-foreground">Quem a gente avisa se acontecer alguma coisa durante o treino?</p>
            {text("emergency_name", "Nome", { autoCapitalize: "words" })}
            {text("emergency_phone", "Telefone", { inputMode: "tel", mask: maskPhone, placeholder: "(15) 99999-9999" })}
            {text("emergency_relation", "Quem é", { placeholder: "Mãe, cônjuge, amigo…" })}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-6">
            <fieldset data-field="goals" className="grid gap-3">
              <legend className="mb-1 text-sm font-semibold">O que você quer com os treinos? (pode marcar mais de um)</legend>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <ChipToggle
                    key={g}
                    pressed={draft.goals.includes(g)}
                    onPressedChange={(on) => update("goals", on ? [...draft.goals, g] : draft.goals.filter((x) => x !== g))}
                  >
                    {g}
                  </ChipToggle>
                ))}
              </div>
              {errors.goals && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errors.goals}
                </p>
              )}
            </fieldset>
            {text("goals_notes", "Quer contar mais? (opcional)", { multiline: true, placeholder: "Ex.: correr 5 km, voltar a jogar bola…" })}
            <div className="grid grid-cols-2 gap-3">
              {text("height", "Altura", { inputMode: "decimal", placeholder: "1,70", suffix: "m" })}
              {text("weight", "Peso", { inputMode: "decimal", placeholder: "72,5", suffix: "kg" })}
            </div>
          </div>
        )}

        {step === 4 && (
          <fieldset data-field="due_day" className="grid gap-4">
            <legend className="mb-2 text-muted-foreground">
              Qual o melhor dia do mês para pagar a mensalidade? O valor é combinado com o Gabriel.
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {["5", "10", "15", "20", "25"].map((day) => (
                <ChipToggle key={day} big pressed={draft.due_day === day} onPressedChange={() => update("due_day", day)}>
                  Dia {day}
                </ChipToggle>
              ))}
              <ChipToggle
                big
                pressed={!!draft.due_day && !["5", "10", "15", "20", "25"].includes(draft.due_day)}
                onPressedChange={() => {
                  update("due_day", "1")
                  requestAnimationFrame(() => document.getElementById("due_day_other")?.focus())
                }}
              >
                Outro
              </ChipToggle>
            </div>
            {!!draft.due_day && !["5", "10", "15", "20", "25"].includes(draft.due_day) && (
              <TextField
                id="due_day_other"
                label="Qual dia? (1 a 31)"
                value={draft.due_day}
                inputMode="numeric"
                maxLength={2}
                onChange={(v) => update("due_day", onlyDigits(v))}
                onBlur={() => blur("due_day")}
              />
            )}
            {errors.due_day && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errors.due_day}
              </p>
            )}
          </fieldset>
        )}

        {step === 5 && (
          <div className="grid gap-6">
            <p className="text-muted-foreground">
              Responda com sinceridade. Um “sim” não impede você de treinar: só pedimos uma liberação do seu médico antes de
              começar.
            </p>
            <ol data-field="parq" className="grid gap-3">
              {PARQ_QUESTIONS.map((q, i) => (
                <li key={i} className="grid gap-3 rounded-xl border border-border bg-card p-4">
                  <p id={`parq-${i}`} className="font-medium">
                    <span className="mr-1 font-display font-bold text-brand-ink">{i + 1}.</span> {q}
                  </p>
                  <YesNo
                    labelledBy={`parq-${i}`}
                    value={draft.parq[i] ?? null}
                    onChange={(v) => update("parq", draft.parq.map((a, j) => (j === i ? v : a)))}
                  />
                </li>
              ))}
            </ol>
            {errors.parq && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errors.parq}
              </p>
            )}
            {text("health_notes", "Tem algo que o seu personal deva saber? (dor, lesão, restrição)", {
              multiline: true,
              placeholder: "Opcional",
            })}
            <div data-field="declaration" className="grid gap-2">
              <p className="rounded-xl bg-muted p-4 text-sm leading-relaxed">{doc("declaracao_saude")?.body}</p>
              <CheckRow
                id="declaration"
                checked={draft.declaration}
                onChange={(v) => update("declaration", v)}
                error={errors.declaration}
              >
                Li e concordo com a declaração acima.
              </CheckRow>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-6">
            {(["termos", "lgpd"] as const).map((kind) => (
              <section key={kind} data-field={kind === "termos" ? "terms" : "lgpd"} className="grid gap-2">
                <h2 className="font-display text-xl font-bold uppercase">
                  {kind === "termos" ? "Termos de uso" : "Seus dados (LGPD)"}
                </h2>
                <div className="max-h-56 overflow-y-auto rounded-xl bg-muted p-4 text-sm leading-relaxed whitespace-pre-line">
                  {doc(kind)?.body}
                </div>
                <CheckRow
                  id={kind === "termos" ? "terms" : "lgpd"}
                  checked={kind === "termos" ? draft.terms : draft.lgpd}
                  onChange={(v) => update(kind === "termos" ? "terms" : "lgpd", v)}
                  error={kind === "termos" ? errors.terms : errors.lgpd}
                >
                  {kind === "termos" ? "Li e aceito os termos de uso." : "Autorizo o uso dos meus dados como descrito acima."}
                </CheckRow>
              </section>
            ))}
            <FormAlert>{submitError}</FormAlert>
          </div>
        )}
      </main>

      {/* Ações na parte de baixo, ao alcance do polegar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-3 px-5 py-3">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={() => goTo(step - 1)} disabled={submitting} aria-label="Voltar">
              <ArrowLeft />
            </Button>
          )}
          {isLast ? (
            <Button size="lg" className="flex-1" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              {submitting ? "Enviando…" : "Enviar cadastro"}
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={next}>
              Continuar <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null
  return (
    <span
      className={cn("flex items-center gap-1 text-xs font-medium", state === "offline" ? "text-warning" : "text-sidebar-foreground/75")}
      aria-live="polite"
    >
      {state === "saving" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {state === "saved" && <Check className="size-3.5" aria-hidden />}
      {state === "offline" && <CloudOff className="size-3.5" aria-hidden />}
      {state === "saving" ? "Salvando" : state === "saved" ? "Salvo" : "Sem conexão"}
    </span>
  )
}
