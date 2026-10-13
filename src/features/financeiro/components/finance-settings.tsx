"use client"

import { Loader2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ChipToggle, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { buildPixPayload, normalizePixKey, type PixKeyKind } from "@/integrations/payments/pix"
import { maskCPF, maskPhone } from "@/lib/validation"

import { saveChargeMessages, savePixSettings } from "../actions"

const KEY_TYPES: { id: PixKeyKind; label: string }[] = [
  { id: "cpf", label: "CPF" },
  { id: "cnpj", label: "CNPJ" },
  { id: "telefone", label: "Celular" },
  { id: "email", label: "E-mail" },
  { id: "aleatoria", label: "Aleatória" },
]

const maskCNPJ = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

const displayKey = (key: string, kind: PixKeyKind | null) =>
  kind === "cpf" ? maskCPF(key) : kind === "cnpj" ? maskCNPJ(key) : kind === "telefone" ? maskPhone(key.replace(/^\+55/, "")) : key

export function PixSettingsForm({
  initial,
}: {
  initial: { pix_key: string | null; pix_key_type: string | null; pix_receiver_name: string | null; pix_city: string | null }
}) {
  const [kind, setKind] = useState<PixKeyKind | null>((initial.pix_key_type as PixKeyKind) ?? null)
  const [key, setKey] = useState(displayKey(initial.pix_key ?? "", (initial.pix_key_type as PixKeyKind) ?? null))
  const [name, setName] = useState(initial.pix_receiver_name ?? "")
  const [city, setCity] = useState(initial.pix_city ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  const valid = kind && normalizePixKey(key, kind) && name.trim().length >= 3 && city.trim().length >= 2
  let preview: string | null = null
  if (valid) {
    try {
      preview = buildPixPayload({ key, keyType: kind, receiverName: name, city, amountCents: 100 })
    } catch {
      preview = null
    }
  }
  const mask = kind === "cpf" ? maskCPF : kind === "cnpj" ? maskCNPJ : kind === "telefone" ? maskPhone : undefined

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await savePixSettings({ keyType: kind ?? "", key, receiverName: name, city })
          if (!res.ok) return setErrors(res.fieldErrors ?? { key: res.message })
          setErrors({})
          toast.success("Pix salvo. As próximas cobranças já levam o copia e cola.")
        })
      }}
      noValidate
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">Tipo da chave</legend>
        <div className="flex flex-wrap gap-2">
          {KEY_TYPES.map((t) => (
            <ChipToggle
              key={t.id}
              pressed={kind === t.id}
              onPressedChange={() => {
                setKind(t.id)
                setKey("")
                setErrors({})
              }}
            >
              {t.label}
            </ChipToggle>
          ))}
        </div>
        {errors.keyType && <p className="text-sm font-medium text-destructive">{errors.keyType}</p>}
      </fieldset>
      <TextField
        id="pix_key"
        label="Chave Pix"
        value={key}
        onChange={(v) => {
          setKey(v)
          setErrors((e) => ({ ...e, key: "" }))
        }}
        mask={mask}
        inputMode={kind === "email" ? "email" : kind === "aleatoria" ? "text" : kind ? "numeric" : "text"}
        autoCapitalize="none"
        spellCheck={false}
        disabled={!kind}
        placeholder={kind ? undefined : "Escolha o tipo primeiro"}
        error={errors.key}
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <TextField id="pix_name" label="Nome do recebedor" value={name} onChange={setName} error={errors.receiverName} hint="Como aparece no app do banco." />
        <TextField id="pix_city" label="Cidade" value={city} onChange={setCity} error={errors.city} />
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {preview ? "✓ Chave válida: o Pix copia e cola vai junto em cada cobrança." : "Preencha os campos para gerar o Pix copia e cola."}
      </p>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Salvar Pix
      </Button>
    </form>
  )
}

const MESSAGES = [
  { id: "msg_reminder", label: "Lembrete (antes do vencimento)" },
  { id: "msg_due_today", label: "Vence hoje" },
  { id: "msg_overdue", label: "Em atraso" },
] as const

export function ChargeMessagesForm({ initial }: { initial: Record<(typeof MESSAGES)[number]["id"], string> }) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()
  const changed = MESSAGES.some((m) => values[m.id].trim() !== initial[m.id].trim())
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveChargeMessages(values)
          if (!res.ok) return setErrors(res.fieldErrors ?? {})
          setErrors({})
          toast.success("Mensagens salvas.")
        })
      }}
    >
      <p className="text-sm text-muted-foreground">
        Use {"{primeiro_nome}"}, {"{valor}"}, {"{vencimento}"} e {"{pix}"}: o sistema troca pelos dados de cada mensalidade.
      </p>
      {MESSAGES.map((m) => (
        <TextField
          key={m.id}
          id={m.id}
          label={m.label}
          value={values[m.id]}
          onChange={(v) => setValues((x) => ({ ...x, [m.id]: v }))}
          multiline
          error={errors[m.id]}
          className="[&_textarea]:min-h-32"
        />
      ))}
      {changed && (
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Salvar mensagens
        </Button>
      )}
    </form>
  )
}
