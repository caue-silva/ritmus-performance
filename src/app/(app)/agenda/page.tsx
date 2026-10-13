import { CalendarOff, ChevronLeft, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/shell/page-header"
import { getSessions, type SessionSummary } from "@/features/agenda/queries"
import { requireStaff } from "@/lib/auth"
import { addDays, formatDayShort, isISODate, todaySP, weekdayOf, weekStart } from "@/lib/dates"
import { firstName, formatHour, WEEKDAY_SHORT } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Agenda" }

type View = "dia" | "semana"

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const staff = await requireStaff()
  const sp = await searchParams
  const isAdmin = staff.role === "admin"
  const today = todaySP()
  const date = isISODate(sp.data) ? sp.data : today
  const view: View | null = sp.visao === "dia" || sp.visao === "semana" ? sp.visao : null
  const personal = isAdmin && typeof sp.personal === "string" ? sp.personal : undefined

  const monday = weekStart(date)
  const sunday = addDays(monday, 6)
  const supabase = await createClient()
  const [sessions, staffList] = await Promise.all([
    getSessions(monday, sunday, personal),
    isAdmin ? supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name") : null,
  ])

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { data: date, visao: view ?? undefined, personal, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    if (p.get("data") === today) p.delete("data")
    const q = p.toString()
    return q ? `/agenda?${q}` : "/agenda"
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter(
    (d) => weekdayOf(d) !== 0 || sessions.some((s) => s.date === d),
  )
  const daySessions = sessions.filter((s) => s.date === date)

  return (
    <>
      <PageHeader
        title="Agenda"
        description={isAdmin ? (personal ? `Horários de ${firstName(staffList?.data?.find((p) => p.id === personal)?.full_name ?? "")}` : "Todos os horários") : "Seus horários"}
        actions={
          <div className="hidden rounded-lg bg-muted p-1 md:flex" role="group" aria-label="Visualização">
            {(["dia", "semana"] as const).map((v) => {
              const current = view ? view === v : v === "semana"
              return (
                <Link
                  key={v}
                  href={href({ visao: v })}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex min-h-tap items-center rounded-md px-4 font-semibold",
                    current ? "bg-card shadow-xs" : "text-muted-foreground",
                  )}
                >
                  {v === "dia" ? "Dia" : "Semana"}
                </Link>
              )
            })}
          </div>
        }
      />

      {isAdmin && staffList?.data && (
        <nav aria-label="Filtrar por personal" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {[{ id: undefined, full_name: "Todos" }, ...staffList.data].map((p) => (
            <Link
              key={p.id ?? "todos"}
              href={href({ personal: p.id })}
              aria-current={personal === p.id ? "page" : undefined}
              className={cn(
                "flex min-h-tap shrink-0 items-center rounded-full border px-4 text-sm font-semibold",
                personal === p.id ? "border-foreground bg-foreground text-background" : "border-input bg-card",
              )}
            >
              {p.id ? firstName(p.full_name) : p.full_name}
            </Link>
          ))}
        </nav>
      )}

      {/* Dia: padrão no celular */}
      <section className={cn(view === "semana" ? "hidden" : view === "dia" ? "block" : "md:hidden")} aria-label="Agenda do dia">
        <div className="mb-3 flex items-center gap-2">
          <NavButton href={href({ data: addDays(date, -1) })} label="Dia anterior" dir="prev" />
          <div className="flex-1 text-center">
            <p className="font-display text-2xl font-bold uppercase">{date === today ? "Hoje" : formatDayShort(date)}</p>
            {date !== today && (
              <Link href={href({ data: today })} className="text-sm font-semibold text-brand-ink underline-offset-4 hover:underline">
                Voltar para hoje
              </Link>
            )}
          </div>
          <NavButton href={href({ data: addDays(date, 1) })} label="Próximo dia" dir="next" />
        </div>
        <div className="mb-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d) => (
            <Link
              key={d}
              href={href({ data: d })}
              aria-current={d === date ? "date" : undefined}
              className={cn(
                "flex min-h-tap-lg flex-col items-center justify-center rounded-lg text-sm leading-tight font-semibold",
                d === date ? "bg-foreground text-background" : d === today ? "bg-brand-soft text-brand-ink" : "bg-card",
              )}
            >
              {WEEKDAY_SHORT[weekdayOf(d)]}
              <span className="text-base">{d.slice(8, 10)}</span>
            </Link>
          ))}
        </div>
        {daySessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center text-muted-foreground">
            <CalendarOff className="size-6" aria-hidden />
            Nenhum horário neste dia.
          </div>
        ) : (
          <ul className="grid gap-2">
            {daySessions.map((s) => (
              <li key={s.id}>
                <SessionRow session={s} showPersonal={isAdmin && !personal} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Semana: padrão no tablet e computador */}
      <section className={cn(view === "semana" ? "block" : view === "dia" ? "hidden" : "hidden md:block")} aria-label="Agenda da semana">
        <div className="mb-3 flex items-center gap-2">
          <NavButton href={href({ data: addDays(monday, -7) })} label="Semana anterior" dir="prev" />
          <p className="flex-1 text-center font-display text-2xl font-bold uppercase">
            {monday.slice(8, 10)}/{monday.slice(5, 7)} a {sunday.slice(8, 10)}/{sunday.slice(5, 7)}
          </p>
          <NavButton href={href({ data: addDays(monday, 7) })} label="Próxima semana" dir="next" />
        </div>
        <WeekGrid sessions={sessions} days={days} today={today} showPersonal={isAdmin && !personal} dayHref={(d) => href({ data: d, visao: "dia" })} />
      </section>
    </>
  )
}

function NavButton({ href, label, dir }: { href: string; label: string; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight
  return (
    <Link href={href} aria-label={label} className="grid size-tap-lg place-items-center rounded-full border border-input bg-card hover:border-foreground/40">
      <Icon className="size-6" aria-hidden />
    </Link>
  )
}

function Occupancy({ s, compact }: { s: SessionSummary; compact?: boolean }) {
  if (s.status !== "normal") {
    return (
      <span className="text-sm font-semibold text-muted-foreground">
        {s.status === "feriado" ? (compact ? "Feriado" : `Feriado${s.status_reason ? ` · ${s.status_reason}` : ""}`) : "Cancelada"}
      </span>
    )
  }
  const full = s.taken >= s.capacity
  return (
    <span className="flex items-center gap-1.5" aria-label={`${s.taken} de ${s.capacity} vagas ocupadas`}>
      {!compact && (
        <span className="flex gap-0.5" aria-hidden>
          {Array.from({ length: s.capacity }, (_, i) => (
            <span key={i} className={cn("size-2.5 rounded-full", i < s.taken ? (full ? "bg-foreground" : "bg-brand") : "bg-border")} />
          ))}
        </span>
      )}
      <span className="font-semibold tabular-nums">
        {s.taken}/{s.capacity}
      </span>
    </span>
  )
}

function SessionRow({ session: s, showPersonal }: { session: SessionSummary; showPersonal: boolean }) {
  return (
    <Link
      href={`/agenda/aula/${s.id}`}
      className={cn(
        "flex min-h-16 items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/30",
        s.status !== "normal" && "bg-muted/60",
      )}
    >
      <span className={cn("w-14 font-display text-2xl font-bold", s.status !== "normal" && "text-muted-foreground line-through")}>
        {formatHour(s.start_time)}
      </span>
      <span className="grid min-w-0 flex-1">
        {showPersonal && <span className="truncate font-semibold">{s.personal_name}</span>}
        {s.status === "normal" && (
          <span className="text-sm text-muted-foreground">
            {s.taken === 0 ? "Sem alunos" : `${s.taken} ${s.taken === 1 ? "aluno" : "alunos"}`}
            {s.makeups > 0 && ` · ${s.makeups} ${s.makeups === 1 ? "reposição" : "reposições"}`}
          </span>
        )}
      </span>
      <Occupancy s={s} />
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </Link>
  )
}

function WeekGrid({
  sessions,
  days,
  today,
  showPersonal,
  dayHref,
}: {
  sessions: SessionSummary[]
  days: string[]
  today: string
  showPersonal: boolean
  dayHref: (d: string) => string
}) {
  const times = [...new Set(sessions.map((s) => s.start_time))].sort()
  if (!times.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center text-muted-foreground">
        Nenhum horário nesta semana.
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-14 p-2" />
            {days.map((d) => (
              <th key={d} scope="col" className="p-1">
                <Link
                  href={dayHref(d)}
                  className={cn(
                    "flex min-h-tap flex-col items-center justify-center rounded-lg leading-tight",
                    d === today ? "bg-brand-soft text-brand-ink" : "hover:bg-muted",
                  )}
                >
                  <span className="font-semibold">{WEEKDAY_SHORT[weekdayOf(d)]}</span>
                  <span className="text-xs">{d.slice(8, 10)}/{d.slice(5, 7)}</span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t) => (
            <tr key={t} className="border-t border-border">
              <th scope="row" className="p-2 text-left font-display text-lg font-bold">
                {formatHour(t)}
              </th>
              {days.map((d) => {
                const s = sessions.find((x) => x.date === d && x.start_time === t)
                return (
                  <td key={d} className="p-1">
                    {s ? (
                      <Link
                        href={`/agenda/aula/${s.id}`}
                        className={cn(
                          "flex min-h-tap-lg flex-col items-center justify-center rounded-lg border px-1 leading-tight transition-colors hover:border-foreground/40",
                          s.status !== "normal"
                            ? "border-dashed border-border text-muted-foreground"
                            : s.taken >= s.capacity
                              ? "border-foreground bg-foreground text-background"
                              : s.taken > 0
                                ? "border-brand/40 bg-brand-soft"
                                : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {showPersonal && <span className="max-w-full truncate text-xs font-semibold">{firstName(s.personal_name)}</span>}
                        <Occupancy s={s} compact />
                      </Link>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
