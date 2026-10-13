"use client"

import { Check, Copy, Loader2, MessageCircle, UserPlus } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FormAlert } from "@/components/feedback/form-field"
import { TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { maskPhone } from "@/lib/validation"

import { createPreRegistration } from "../actions"

type Created = { studentId: string; link: string; whatsappUrl: string | null; name: string }

export function PreRegistrationForm() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [created, setCreated] = useState<Created | null>(null)
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = await createPreRegistration({ full_name: name, whatsapp: phone })
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.fieldErrors ? undefined : res.message)
        return
      }
      setCreated({ ...res.data, name: name.trim() })
    })
  }

  if (created) {
    return <InviteReady {...created} onAnother={() => {
      setCreated(null)
      setName("")
      setPhone("")
    }} />
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <FormAlert>{formError}</FormAlert>
      <TextField
        id="full_name"
        label="Nome completo"
        value={name}
        onChange={(v) => {
          setName(v)
          setErrors((x) => ({ ...x, full_name: "" }))
        }}
        autoCapitalize="words"
        autoComplete="off"
        error={errors.full_name}
        autoFocus
      />
      <TextField
        id="whatsapp"
        label="WhatsApp"
        value={phone}
        onChange={(v) => {
          setPhone(v)
          setErrors((x) => ({ ...x, whatsapp: "" }))
        }}
        mask={maskPhone}
        inputMode="tel"
        placeholder="(15) 99999-9999"
        error={errors.whatsapp}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />}
        Criar e gerar link
      </Button>
    </form>
  )
}

/** Link pronto: o botão principal abre o WhatsApp com a mensagem já escrita. */
export function InviteReady({
  studentId,
  name,
  link,
  whatsappUrl,
  onAnother,
}: Created & { onAnother?: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success("Link copiado.")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Não deu para copiar. Segure o dedo no link para copiar.")
    }
  }
  return (
    <div className="grid gap-5 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success">
          <Check className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-display text-xl font-bold uppercase">Link pronto</p>
          <p className="text-sm text-muted-foreground">Vale por 7 dias. Agora é só mandar para {name.split(" ")[0]}.</p>
        </div>
      </div>
      <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all select-all">{link}</p>
      {whatsappUrl && (
        <Button asChild size="lg">
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden /> Enviar no WhatsApp
          </a>
        </Button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} Copiar link
        </Button>
        <Button asChild variant="outline">
          <Link href={`/alunos/${studentId}`}>Ver ficha</Link>
        </Button>
      </div>
      {onAnother && (
        <Button variant="ghost" onClick={onAnother}>
          Cadastrar outro aluno
        </Button>
      )}
    </div>
  )
}
