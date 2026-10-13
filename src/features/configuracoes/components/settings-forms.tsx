"use client"

import { Loader2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { centsToMoneyInput, MoneyField, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import type { Enums } from "@/lib/supabase/database.types"
import { parseMoneyToCents } from "@/lib/validation"

import { saveInviteMessage, saveLegalDocument, saveReferenceFees } from "../actions"

function SaveButton({ pending, children = "Salvar" }: { pending: boolean; children?: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="justify-self-start">
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  )
}

export function LegalDocumentForm({
  kind,
  label,
  version,
  updatedAt,
  body,
}: {
  kind: Enums<"legal_doc_kind">
  label: string
  version: number
  updatedAt: string
  body: string
}) {
  const [text, setText] = useState(body)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const changed = text.trim() !== body.trim()
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveLegalDocument(kind, text)
          if (!res.ok) return setError(res.message)
          setError(undefined)
          toast.success(`${label}: versão ${version + 1} salva. Os próximos cadastros já usam o texto novo.`)
        })
      }}
    >
      <TextField
        id={`doc-${kind}`}
        label={label}
        value={text}
        onChange={(v) => {
          setText(v)
          setError(undefined)
        }}
        multiline
        error={error}
        hint={`Versão ${version}, de ${formatDate(updatedAt)}. Salvar cria a versão ${version + 1}; quem já aceitou fica com o registro da versão que aceitou.`}
        className="[&_textarea]:min-h-40"
      />
      {changed && <SaveButton pending={pending}>Salvar como versão {version + 1}</SaveButton>}
    </form>
  )
}

export function InviteMessageForm({ message }: { message: string }) {
  const [text, setText] = useState(message)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveInviteMessage(text)
          if (!res.ok) return setError(res.message)
          setError(undefined)
          toast.success("Mensagem salva.")
        })
      }}
    >
      <TextField
        id="msg_invite"
        label="Mensagem do link de cadastro"
        value={text}
        onChange={(v) => {
          setText(v)
          setError(undefined)
        }}
        multiline
        error={error}
        hint="Use {primeiro_nome} e {link}: o sistema troca pelos dados do aluno."
        className="[&_textarea]:min-h-28"
      />
      {text.trim() !== message.trim() && <SaveButton pending={pending} />}
    </form>
  )
}

export function ReferenceFeesForm({ fees }: { fees: Record<string, number> }) {
  const keys = ["2", "3", "5"]
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(keys.map((k) => [k, centsToMoneyInput(fees[k])])))
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveReferenceFees(Object.fromEntries(keys.map((k) => [k, parseMoneyToCents(values[k] ?? "")])))
          if (!res.ok) return setError(res.message)
          setError(undefined)
          toast.success("Valores de referência salvos.")
        })
      }}
    >
      <p className="text-sm text-muted-foreground">
        Só uma sugestão na hora de definir o valor: cada aluno tem o valor combinado com você.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {keys.map((k) => (
          <MoneyField key={k} id={`fee-${k}`} label={`${k}x por semana`} value={values[k] ?? ""} onChange={(v) => setValues((x) => ({ ...x, [k]: v }))} />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <SaveButton pending={pending} />
    </form>
  )
}
