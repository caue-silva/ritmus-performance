"use client"

import { HeartPulse, Link2, PauseCircle, PlayCircle, UserCheck, UserX } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { formatBRL, summarizeSchedule } from "@/lib/format"
import type { Enums } from "@/lib/supabase/database.types"

import { regenerateInvite, releaseStudent, setStudentSchedule } from "../actions"
import type { ActivationOptions } from "../queries"
import { SlotPicker } from "./slot-picker"
import { ActivationSheet, type ActivationTarget } from "./activation-sheet"
import { InviteReady } from "./pre-registration-form"
import { ClearanceSheet, FeeSheet } from "./quick-sheets"

type Props = {
  target: ActivationTarget
  status: Enums<"student_status">
  needsClearance: boolean
  options: ActivationOptions
}

/** Ação principal do admin na ficha, conforme o status do aluno. */
export function StudentPrimaryAction({ target, status, needsClearance, options }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<"ativar" | "liberacao" | null>(null)
  const [invite, setInvite] = useState<{ link: string; whatsappUrl: string | null } | null>(null)
  const [pending, start] = useTransition()

  const regenerate = () =>
    start(async () => {
      const res = await regenerateInvite(target.id)
      if (!res.ok) return void toast.error(res.message)
      setInvite(res.data)
    })

  let button: React.ReactNode = null
  if (status === "convidado") {
    button = (
      <Button size="lg" onClick={regenerate} disabled={pending}>
        <Link2 aria-hidden /> Gerar novo link
      </Button>
    )
  } else if (needsClearance && status !== "inativo") {
    button = (
      <Button size="lg" onClick={() => setOpen("liberacao")}>
        <HeartPulse aria-hidden /> Registrar liberação médica
      </Button>
    )
  } else if (status === "aguardando") {
    button = (
      <Button size="lg" onClick={() => setOpen("ativar")}>
        <UserCheck aria-hidden /> Ativar aluno
      </Button>
    )
  } else if (status === "pausado" || status === "inativo") {
    button = (
      <Button size="lg" onClick={() => setOpen("ativar")}>
        <PlayCircle aria-hidden /> Reativar
      </Button>
    )
  }

  return (
    <>
      {button}
      {open === "ativar" && (
        <ActivationSheet
          open
          onOpenChange={(o) => !o && setOpen(null)}
          target={target}
          options={options}
          onActivated={() => router.refresh()}
          onUndone={() => router.refresh()}
        />
      )}
      {open === "liberacao" && (
        <ClearanceSheet
          open
          onOpenChange={(o) => !o && setOpen(null)}
          studentId={target.id}
          name={target.full_name}
          onDone={() => router.refresh()}
          onUndone={() => router.refresh()}
        />
      )}
      <Dialog open={!!invite} onOpenChange={(o) => !o && setInvite(null)}>
        <DialogContent className="max-w-md p-0">
          <DialogTitle className="sr-only">Novo link de cadastro</DialogTitle>
          <DialogDescription className="sr-only">Envie o link para o aluno pelo WhatsApp.</DialogDescription>
          {invite && <InviteReady studentId={target.id} name={target.full_name} {...invite} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Mensalidade (só admin): valor e vencimento, com botão para mudar. */
export function FeeEditor({
  target,
  referenceFees,
}: {
  target: ActivationTarget
  referenceFees: Record<string, number>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-3xl font-bold">
            {target.fee_cents ? formatBRL(target.fee_cents) : <span className="text-muted-foreground">Sem valor</span>}
          </p>
          <p className="text-sm text-muted-foreground">Vence todo dia {target.due_day ?? "—"}</p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          {target.fee_cents ? "Mudar valor" : "Definir valor"}
        </Button>
      </div>
      {open && (
        <FeeSheet
          open
          onOpenChange={setOpen}
          studentId={target.id}
          name={target.full_name}
          currentFee={target.fee_cents}
          frequency={target.weekly_frequency}
          referenceFees={referenceFees}
          onDone={() => router.refresh()}
          onUndone={() => router.refresh()}
        />
      )}
    </>
  )
}

/** Pausar (férias/lesão) ou inativar. Libera a vaga nos horários fixos. */
export function StatusActions({ studentId, name, status }: { studentId: string; name: string; status: Enums<"student_status"> }) {
  const router = useRouter()
  const [open, setOpen] = useState<"pausado" | "inativo" | null>(null)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const first = name.split(" ")[0]

  if (status !== "ativo" && status !== "pausado") return null

  const confirm = () =>
    start(async () => {
      const res = await releaseStudent(studentId, open!)
      if (!res.ok) return setError(res.message)
      setOpen(null)
      toast.success(open === "pausado" ? `${first} está pausado.` : `${first} está inativo.`)
      router.refresh()
    })

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        {status === "ativo" && (
          <Button variant="outline" onClick={() => setOpen("pausado")}>
            <PauseCircle aria-hidden /> Pausar (férias, lesão)
          </Button>
        )}
        <Button variant="outline" onClick={() => setOpen("inativo")}>
          <UserX aria-hidden /> Inativar
        </Button>
      </div>
      <ActionSheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open === "pausado" ? `Pausar ${first}` : `Inativar ${first}`}
        description={
          open === "pausado"
            ? "Use para férias ou lesão. As vagas dos horários fixos ficam livres e não são geradas mensalidades enquanto estiver pausado. Para voltar, toque em “Reativar” e escolha os horários de novo."
            : "Use quando o aluno sair do estúdio. As vagas ficam livres e não são geradas mensalidades. O histórico continua guardado."
        }
        submitLabel={open === "pausado" ? "Pausar e liberar vagas" : "Inativar e liberar vagas"}
        onSubmit={confirm}
        pending={pending}
        error={error}
      >
        <p className="text-sm text-muted-foreground">Os horários fixos que ficarem livres podem ser ocupados por outros alunos.</p>
      </ActionSheet>
    </>
  )
}

/** Horários fixos do aluno ativo (admin pode trocar). */
export function ScheduleEditor({
  studentId,
  name,
  personalId,
  frequency,
  current,
  options,
}: {
  studentId: string
  name: string
  personalId: string | null
  frequency: number | null
  current: { slot_id: string; weekday: number; start_time: string }[]
  options: ActivationOptions
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(current.map((c) => c.slot_id))
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const slots = options.slots.filter((s) => s.personal_id === personalId || current.some((c) => c.slot_id === s.id))

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">{summarizeSchedule(current)}</p>
        <Button
          variant="outline"
          onClick={() => {
            setSelected(current.map((c) => c.slot_id))
            setError(undefined)
            setOpen(true)
          }}
        >
          Mudar horários
        </Button>
      </div>
      <ActionSheet
        open={open}
        onOpenChange={setOpen}
        title="Horários fixos"
        description={`${name}${frequency ? ` · ${frequency}x por semana` : ""}. Vale a partir de hoje.`}
        submitLabel="Salvar horários"
        onSubmit={() =>
          start(async () => {
            const res = await setStudentSchedule(studentId, selected)
            if (!res.ok) return setError(res.message)
            setOpen(false)
            toast.success("Horários atualizados.")
            router.refresh()
          })
        }
        pending={pending}
        error={error}
      >
        {slots.length ? (
          <SlotPicker
            slots={slots}
            selected={selected}
            onChange={setSelected}
            alreadyMine={current.map((c) => c.slot_id)}
            frequency={frequency ?? undefined}
          />
        ) : (
          <p className="text-muted-foreground">O personal deste aluno ainda não tem horários. Monte a grade em Configurações → Horários.</p>
        )}
      </ActionSheet>
    </>
  )
}
