"use client"

import { CalendarClock, Check, Copy, KeyRound, MessageCircle, Pencil, Plus, Power, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { toastWithUndo } from "@/components/feedback/undo-toast"
import { TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { firstName, formatPhone, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import { maskPhone } from "@/lib/validation"
import { whatsappLink } from "@/lib/whatsapp"

import { createStaff, resetStaffPassword, setStaffActive, suggestTempPassword, updateStaff } from "../actions"

export type Member = {
  id: string
  full_name: string
  email: string
  whatsapp: string | null
  role: "admin" | "personal"
  active: boolean
  must_change_password: boolean
  isMe: boolean
  activeStudents: number
  schedule: string
}

type Credentials = { name: string; email: string; password: string; whatsapp: string | null; isNew: boolean }

export function TeamList({ members, suggestedPassword, loginUrl }: { members: Member[]; suggestedPassword: string; loginUrl: string }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [resetting, setResetting] = useState<Member | null>(null)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [, start] = useTransition()

  const toggleActive = (m: Member) =>
    start(async () => {
      const res = await setStaffActive(m.id, !m.active)
      if (!res.ok) return void toast.error(res.message)
      router.refresh()
      if (m.active) {
        toastWithUndo(`${firstName(m.full_name)} não consegue mais entrar no app.`, async () => {
          if ((await setStaffActive(m.id, true)).ok) router.refresh()
        })
      } else {
        toast.success(`${firstName(m.full_name)} pode entrar no app de novo.`)
      }
    })

  return (
    <>
      <ul className="grid gap-3 pb-20 md:grid-cols-2 md:pb-0">
        {members.map((m) => (
          <li key={m.id} className={cn("grid gap-4 rounded-xl border border-border bg-card p-5", !m.active && "opacity-75")}>
            <div className="flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground font-bold text-background">
                {initials(m.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl leading-tight font-bold uppercase">{m.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                {m.whatsapp && <p className="text-sm text-muted-foreground">{formatPhone(m.whatsapp)}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 font-semibold">{m.role === "admin" ? "Administrador" : "Personal"}</span>
              {!m.active && <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 font-semibold text-destructive">Desativado</span>}
              {m.active && m.must_change_password && (
                <span className="rounded-full bg-warning-soft px-2.5 py-0.5 font-semibold text-warning">Ainda não criou a senha</span>
              )}
            </div>
            <dl className="grid gap-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Alunos ativos:</dt>
                <dd className="font-semibold">{m.activeStudents}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-muted-foreground">Horários:</dt>
                <dd className="font-semibold">{m.schedule}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                <Pencil aria-hidden /> Editar
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/configuracoes/horarios">
                  <CalendarClock aria-hidden /> Horários
                </Link>
              </Button>
              {!m.isMe && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setResetting(m)}>
                    <KeyRound aria-hidden /> Redefinir senha
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(m)}>
                    <Power aria-hidden /> {m.active ? "Desativar" : "Ativar"}
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Button
        size="lg"
        onClick={() => setCreating(true)}
        className="fixed right-4 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1rem)] z-30 rounded-full shadow-lg md:static md:mt-5 md:rounded-lg md:shadow-none"
      >
        <Plus aria-hidden /> Novo personal
      </Button>

      {creating && (
        <NewStaffSheet
          suggestedPassword={suggestedPassword}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false)
            setCredentials(c)
            router.refresh()
          }}
        />
      )}
      {editing && <EditStaffSheet member={editing} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />}
      {resetting && (
        <ResetSheet
          member={resetting}
          onClose={() => setResetting(null)}
          onDone={(password) => {
            setCredentials({ name: resetting.full_name, email: resetting.email, password, whatsapp: resetting.whatsapp, isNew: false })
            setResetting(null)
            router.refresh()
          }}
        />
      )}
      <CredentialsDialog credentials={credentials} loginUrl={loginUrl} onClose={() => setCredentials(null)} />
    </>
  )
}

function NewStaffSheet({
  suggestedPassword,
  onClose,
  onCreated,
}: {
  suggestedPassword: string
  onClose: () => void
  onCreated: (c: Credentials) => void
}) {
  const [v, setV] = useState({ full_name: "", email: "", whatsapp: "", password: suggestedPassword })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, start] = useTransition()

  const set = (k: keyof typeof v) => (value: string) => {
    setV((x) => ({ ...x, [k]: value }))
    setErrors((e) => ({ ...e, [k]: "" }))
  }

  const submit = () =>
    start(async () => {
      const res = await createStaff(v)
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.fieldErrors ? undefined : res.message)
        return
      }
      onCreated({ name: v.full_name, email: v.email.trim().toLowerCase(), password: v.password, whatsapp: v.whatsapp, isNew: true })
    })

  return (
    <ActionSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Novo personal"
      description="Ele entra com o e-mail e a senha temporária e cria a própria senha no primeiro acesso."
      submitLabel="Criar conta"
      onSubmit={submit}
      pending={pending}
      error={formError}
    >
      <TextField id="full_name" label="Nome completo" value={v.full_name} onChange={set("full_name")} error={errors.full_name} autoCapitalize="words" />
      <TextField
        id="email"
        label="E-mail (é o login)"
        value={v.email}
        onChange={set("email")}
        error={errors.email}
        type="email"
        inputMode="email"
        autoCapitalize="none"
      />
      <TextField id="whatsapp" label="WhatsApp" value={v.whatsapp} onChange={set("whatsapp")} error={errors.whatsapp} mask={maskPhone} inputMode="tel" />
      <div className="grid gap-2">
        <TextField
          id="password"
          label="Senha temporária"
          value={v.password}
          onChange={set("password")}
          error={errors.password}
          autoCapitalize="none"
          spellCheck={false}
          className="[&_input]:font-mono"
        />
        <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={async () => set("password")(await suggestTempPassword())}>
          <RefreshCw aria-hidden /> Gerar outra
        </Button>
      </div>
    </ActionSheet>
  )
}

function EditStaffSheet({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ full_name: member.full_name, whatsapp: maskPhone(member.whatsapp ?? "") })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()
  const submit = () =>
    start(async () => {
      const res = await updateStaff(member.id, v)
      if (!res.ok) return setErrors(res.fieldErrors ?? { full_name: res.message })
      toast.success("Dados salvos.")
      onSaved()
      onClose()
    })
  return (
    <ActionSheet open onOpenChange={(o) => !o && onClose()} title="Editar dados" description={member.email} submitLabel="Salvar" onSubmit={submit} pending={pending}>
      <TextField id="full_name" label="Nome completo" value={v.full_name} onChange={(x) => setV((s) => ({ ...s, full_name: x }))} error={errors.full_name} />
      <TextField
        id="whatsapp"
        label="WhatsApp"
        value={v.whatsapp}
        onChange={(x) => setV((s) => ({ ...s, whatsapp: x }))}
        error={errors.whatsapp}
        mask={maskPhone}
        inputMode="tel"
      />
    </ActionSheet>
  )
}

function ResetSheet({ member, onClose, onDone }: { member: Member; onClose: () => void; onDone: (password: string) => void }) {
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const submit = () =>
    start(async () => {
      const res = await resetStaffPassword(member.id)
      if (!res.ok) return setError(res.message)
      onDone(res.data.password)
    })
  return (
    <ActionSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Redefinir senha"
      description={`${firstName(member.full_name)} recebe uma senha temporária nova e cria a própria senha no próximo acesso. A senha atual deixa de funcionar.`}
      submitLabel="Gerar senha temporária"
      onSubmit={submit}
      pending={pending}
      error={error}
    >
      <p className="text-sm text-muted-foreground">Depois é só mandar a senha nova para {firstName(member.full_name)} pelo WhatsApp.</p>
    </ActionSheet>
  )
}

function CredentialsDialog({ credentials: c, loginUrl, onClose }: { credentials: Credentials | null; loginUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  if (!c) return null
  const message = `Oi, ${firstName(c.name)}! ${c.isNew ? "Sua conta no app do Ritmus está pronta." : "Redefini sua senha do app do Ritmus."}\n\nAcesse: ${loginUrl}\nE-mail: ${c.email}\nSenha temporária: ${c.password}\n\nNo primeiro acesso você cria a sua própria senha.`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      toast.success("Dados de acesso copiados.")
    } catch {
      toast.error("Não deu para copiar. Anote a senha mostrada na tela.")
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="font-display text-2xl font-bold uppercase">{c.isNew ? "Conta criada" : "Senha redefinida"}</DialogTitle>
        <DialogDescription>Mande os dados de acesso para {firstName(c.name)}. Esta senha aparece só agora.</DialogDescription>
        <dl className="grid gap-2 rounded-lg bg-muted p-4">
          <div>
            <dt className="text-sm text-muted-foreground">E-mail</dt>
            <dd className="font-semibold break-all">{c.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Senha temporária</dt>
            <dd className="font-mono text-lg font-bold select-all">{c.password}</dd>
          </div>
        </dl>
        <div className="grid gap-2">
          {c.whatsapp && (
            <Button asChild size="lg">
              <a href={whatsappLink(c.whatsapp, message)} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden /> Enviar no WhatsApp
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={copy}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />} Copiar dados de acesso
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
