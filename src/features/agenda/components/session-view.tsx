"use client"

import { Ban, Check, ChevronRight, HeartPulse, RotateCcw, UserPlus, UserRound } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { toastWithUndo } from "@/components/feedback/undo-toast"
import { TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { addMinutes, formatDayShort } from "@/lib/dates"
import { firstName, formatHour, initials } from "@/lib/format"
import type { Enums } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

import { removeMakeup, setAttendanceStatus, setSessionCanceled } from "../actions"
import type { RosterEntry, SessionSummary } from "../queries"
import { MakeupSheet } from "./makeup-sheet"

type Status = Enums<"attendance_status">

const STATUS_LABEL: Record<Status, string> = {
  previsto: "Ainda não chegou",
  presente: "Presente",
  falta: "Faltou",
  falta_justificada: "Falta justificada",
}

export function SessionView({
  session,
  roster,
  duration,
  today,
  canManage,
  isAdmin,
}: {
  session: SessionSummary
  roster: RosterEntry[]
  duration: number
  today: string
  canManage: boolean
  isAdmin: boolean
}) {
  const router = useRouter()
  const [overrides, setOverrides] = useState<Record<string, Status>>({})
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<RosterEntry | null>(null)
  const [makeupOpen, setMakeupOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [, start] = useTransition()

  const entries = roster.filter((e) => !removed.has(e.attendance_id)).map((e) => ({ ...e, status: overrides[e.attendance_id] ?? e.status }))
  const active = entries.filter((e) => e.status === "previsto" || e.status === "presente")
  const present = entries.filter((e) => e.status === "presente").length
  const isNormal = session.status === "normal"
  const isFuture = session.date > today
  const free = Math.max(0, session.capacity - active.length)

  const changeStatus = (entry: RosterEntry, status: Status, message: string) => {
    const previous = overrides[entry.attendance_id] ?? entry.status
    setOverrides((o) => ({ ...o, [entry.attendance_id]: status })) // otimista
    start(async () => {
      const res = await setAttendanceStatus(entry.attendance_id, status)
      if (!res.ok) {
        setOverrides((o) => ({ ...o, [entry.attendance_id]: previous }))
        toast.error(res.message)
        return
      }
      toastWithUndo(message, async () => {
        setOverrides((o) => ({ ...o, [entry.attendance_id]: res.data.previous }))
        const undo = await setAttendanceStatus(entry.attendance_id, res.data.previous)
        if (!undo.ok) toast.error(undo.message)
        router.refresh()
      })
      router.refresh()
    })
  }

  const remove = (entry: RosterEntry) => {
    setRemoved((r) => new Set(r).add(entry.attendance_id))
    setSelected(null)
    start(async () => {
      const res = await removeMakeup(entry.attendance_id)
      if (!res.ok) {
        setRemoved((r) => {
          const n = new Set(r)
          n.delete(entry.attendance_id)
          return n
        })
        toast.error(res.message)
        return
      }
      toast.success(`Reposição de ${firstName(entry.full_name)} removida.`)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-5">
      {/* Cabeçalho do horário */}
      <div className="grid gap-3 rounded-2xl bg-sidebar p-5 text-sidebar-foreground">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-sidebar-foreground/75">
              {formatDayShort(session.date)}
              {isAdmin && ` · ${session.personal_name}`}
            </p>
            <p className="font-display text-4xl leading-none font-bold">
              {formatHour(session.start_time)}
              <span className="text-2xl text-sidebar-foreground/60"> – {formatHour(addMinutes(session.start_time, duration))}</span>
            </p>
          </div>
          {isNormal ? (
            <div className="text-right">
              <p className="font-display text-3xl leading-none font-bold text-brand">
                {active.length}/{session.capacity}
              </p>
              <p className="text-sm text-sidebar-foreground/75">{free ? `${free} ${free === 1 ? "vaga" : "vagas"}` : "lotado"}</p>
            </div>
          ) : (
            <span className="rounded-full bg-sidebar-accent px-3 py-1 text-sm font-semibold">
              {session.status === "feriado" ? `Feriado${session.status_reason ? ` · ${session.status_reason}` : ""}` : "Aula cancelada"}
            </span>
          )}
        </div>
        {isNormal && !isFuture && entries.length > 0 && (
          <p className="text-sm text-sidebar-foreground/75" aria-live="polite">
            {present} de {active.length} {active.length === 1 ? "aluno chegou" : "alunos chegaram"}
          </p>
        )}
        {session.status === "cancelada" && session.status_reason && (
          <p className="text-sm text-sidebar-foreground/75">Motivo: {session.status_reason}</p>
        )}
      </div>

      {/* Alunos */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center text-muted-foreground">
          Nenhum aluno neste horário.
          {canManage && isNormal && " Toque em “Adicionar reposição” para encaixar alguém."}
        </div>
      ) : (
        <ul className="grid gap-2" aria-label="Alunos do horário">
          {entries.map((e) => (
            <li
              key={e.attendance_id}
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-card p-2 pl-3 transition-colors",
                e.status === "presente" ? "border-success/40" : "border-border",
                (e.status === "falta" || e.status === "falta_justificada") && "opacity-70",
              )}
            >
              <button
                type="button"
                onClick={() => setSelected(e)}
                disabled={!canManage}
                className="flex min-h-tap-lg min-w-0 flex-1 items-center gap-3 text-left"
                aria-label={`${e.full_name}: ${STATUS_LABEL[e.status]}. Mais opções`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold">
                  {initials(e.full_name)}
                </span>
                <span className="grid min-w-0">
                  <span className="flex items-center gap-1.5 truncate font-semibold">
                    {e.full_name}
                    {e.health_flag && <HeartPulse className="size-4 shrink-0 text-warning" aria-label="Tem observação de saúde" />}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {e.kind === "reposicao" ? `Reposição${e.is_mine ? "" : e.owner_name ? ` · aluno de ${firstName(e.owner_name)}` : ""}` : null}
                    {e.kind === "reposicao" && e.status !== "previsto" ? " · " : ""}
                    {e.kind === "fixo" || e.status !== "previsto" ? STATUS_LABEL[e.status] : null}
                  </span>
                </span>
              </button>
              {canManage && isNormal && !isFuture && (e.status === "previsto" || e.status === "presente") && (
                <button
                  type="button"
                  aria-pressed={e.status === "presente"}
                  onClick={() =>
                    e.status === "presente"
                      ? changeStatus(e, "previsto", `Check-in de ${firstName(e.full_name)} desfeito.`)
                      : changeStatus(e, "presente", `${firstName(e.full_name)} chegou.`)
                  }
                  className={cn(
                    "flex h-tap-lg w-28 shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors",
                    e.status === "presente"
                      ? "bg-success text-success-foreground"
                      : "border-2 border-foreground bg-background hover:bg-foreground hover:text-background",
                  )}
                >
                  {e.status === "presente" ? (
                    <>
                      <Check className="size-5" aria-hidden /> Chegou
                    </>
                  ) : (
                    "Check-in"
                  )}
                </button>
              )}
              {canManage && <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
            </li>
          ))}
        </ul>
      )}

      {/* Ações do horário, na metade de baixo da tela */}
      {canManage && (
        <div className="grid gap-2 sm:grid-cols-2">
          {isNormal && (
            <Button size="lg" variant="dark" onClick={() => setMakeupOpen(true)} disabled={free === 0}>
              <UserPlus aria-hidden /> {free === 0 ? "Horário lotado" : "Adicionar reposição"}
            </Button>
          )}
          {session.status === "normal" ? (
            <Button size="lg" variant="ghost" className="text-destructive" onClick={() => setCancelOpen(true)}>
              <Ban aria-hidden /> Cancelar aula
            </Button>
          ) : session.status === "cancelada" ? (
            <Button
              size="lg"
              variant="outline"
              onClick={() =>
                start(async () => {
                  const res = await setSessionCanceled(session.id, false)
                  if (!res.ok) return void toast.error(res.message)
                  toast.success("Aula reaberta.")
                  router.refresh()
                })
              }
            >
              <RotateCcw aria-hidden /> Reabrir aula
            </Button>
          ) : null}
        </div>
      )}

      <StudentSheet
        entry={selected}
        canSeeProfile={isAdmin || !!selected?.is_mine}
        isFuture={isFuture}
        isNormal={isNormal}
        onClose={() => setSelected(null)}
        onStatus={(entry, status, message) => {
          setSelected(null)
          changeStatus(entry, status, message)
        }}
        onRemove={remove}
      />

      {makeupOpen && (
        <MakeupSheet sessionId={session.id} onClose={() => setMakeupOpen(false)} onAdded={() => router.refresh()} />
      )}

      {cancelOpen && <CancelSheet sessionId={session.id} onClose={() => setCancelOpen(false)} onDone={() => router.refresh()} />}
    </div>
  )
}

/** Opções de um aluno da lista: faltas, ficha, remover reposição. */
function StudentSheet({
  entry,
  canSeeProfile,
  isFuture,
  isNormal,
  onClose,
  onStatus,
  onRemove,
}: {
  entry: RosterEntry | null
  canSeeProfile: boolean
  isFuture: boolean
  isNormal: boolean
  onClose: () => void
  onStatus: (e: RosterEntry, s: Status, message: string) => void
  onRemove: (e: RosterEntry) => void
}) {
  const option = (label: string, onClick: () => void, opts: { tone?: "danger"; icon?: React.ReactNode } = {}) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-tap-lg w-full items-center gap-3 rounded-lg px-4 text-left text-base font-semibold transition-colors hover:bg-muted",
        opts.tone === "danger" && "text-destructive",
      )}
    >
      {opts.icon}
      {label}
    </button>
  )
  const name = entry ? firstName(entry.full_name) : ""
  return (
    <Sheet open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-lg gap-0 rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="border-b border-border px-5 pt-5 pb-4">
          <SheetTitle className="pr-10 font-display text-2xl font-bold uppercase">{entry?.full_name}</SheetTitle>
          <SheetDescription>{entry ? STATUS_LABEL[entry.status] : ""}</SheetDescription>
        </SheetHeader>
        {entry && (
          <div className="grid gap-1 p-3">
            {isNormal && entry.status !== "falta" && option("Faltou", () => onStatus(entry, "falta", `Falta de ${name} registrada.`))}
            {isNormal &&
              entry.status !== "falta_justificada" &&
              option("Falta justificada", () => onStatus(entry, "falta_justificada", `Falta justificada de ${name}. A vaga ficou livre.`))}
            {isNormal &&
              (entry.status === "falta" || entry.status === "falta_justificada") &&
              option(isFuture ? "Vai vir (desfazer falta)" : "Desfazer falta", () => onStatus(entry, "previsto", `${name} está de volta na lista.`))}
            {canSeeProfile && (
              <Link
                href={`/alunos/${entry.student_id}`}
                className="flex min-h-tap-lg items-center gap-3 rounded-lg px-4 text-base font-semibold hover:bg-muted"
              >
                <UserRound className="size-5" aria-hidden /> Ver ficha
              </Link>
            )}
            {entry.kind === "reposicao" &&
              option("Remover reposição", () => onRemove(entry), { tone: "danger" })}
            {entry.kind === "reposicao" && entry.created_by_name && (
              <p className="px-4 pt-2 pb-1 text-sm text-muted-foreground">
                Reposição registrada por {firstName(entry.created_by_name)} em{" "}
                {new Date(entry.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function CancelSheet({ sessionId, onClose, onDone }: { sessionId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  return (
    <ActionSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Cancelar aula"
      description="Os alunos continuam na lista, mas a aula fica marcada como cancelada. Dá para reabrir depois."
      submitLabel="Cancelar esta aula"
      onSubmit={() =>
        start(async () => {
          const res = await setSessionCanceled(sessionId, true, reason)
          if (!res.ok) return setError(res.message)
          onClose()
          onDone()
          toast.success("Aula cancelada. Lembre de avisar os alunos.")
        })
      }
      pending={pending}
      error={error}
    >
      <TextField id="reason" label="Motivo (opcional)" value={reason} onChange={setReason} placeholder="Ex.: personal doente" />
    </ActionSheet>
  )
}
