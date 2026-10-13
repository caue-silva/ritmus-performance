"use client"

import { CalendarX, Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addMinutes, formatDayShort, minutesOf } from "@/lib/dates"
import { firstName, formatDate, formatHour, WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/format"
import { cn } from "@/lib/utils"

import { addClosure, removeClosure, saveBusinessHours, setSlotPersonal } from "../actions"

type Hours = { weekday: number; opens_at: string; closes_at: string }
type Slot = { weekday: number; start_time: string; personal_id: string; fixed: number }
type Staff = { id: string; full_name: string }

const ORDER = [1, 2, 3, 4, 5, 6, 0] // segunda primeiro

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-1">
        <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Grade de horários: para cada dia, quem dá aula em cada hora. */
export function SlotsEditor({
  businessHours,
  duration,
  slots,
  staff,
  initialWeekday,
}: {
  businessHours: Hours[]
  duration: number
  slots: Slot[]
  staff: Staff[]
  initialWeekday?: number
}) {
  const router = useRouter()
  const openDays = ORDER.filter((d) => businessHours.some((h) => h.weekday === d) || slots.some((s) => s.weekday === d))
  const [day, setDay] = useState(initialWeekday !== undefined && openDays.includes(initialWeekday) ? initialWeekday : (openDays[0] ?? 1))
  const [overrides, setOverrides] = useState<Record<string, string | null>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [, start] = useTransition()

  const times = useMemo(() => {
    const h = businessHours.find((x) => x.weekday === day)
    const list = new Set<string>(slots.filter((s) => s.weekday === day).map((s) => s.start_time))
    if (h) {
      for (let t = minutesOf(h.opens_at); t + duration <= minutesOf(h.closes_at); t += duration) {
        list.add(addMinutes("00:00", t))
      }
    }
    return [...list].sort()
  }, [businessHours, slots, day, duration])

  const owner = (time: string) => {
    const key = `${day}-${time}`
    if (key in overrides) return overrides[key]
    return slots.find((s) => s.weekday === day && s.start_time === time)?.personal_id ?? null
  }

  const assign = (time: string, personalId: string | null) => {
    const key = `${day}-${time}`
    const previous = owner(time)
    if (previous === personalId) return
    setOverrides((o) => ({ ...o, [key]: personalId }))
    setPending(key)
    start(async () => {
      const res = await setSlotPersonal(day, time, personalId)
      setPending(null)
      if (!res.ok) {
        setOverrides((o) => ({ ...o, [key]: previous }))
        toast.error(res.message)
        return
      }
      const name = staff.find((s) => s.id === personalId)?.full_name
      toast.success(
        personalId
          ? `${WEEKDAY_SHORT[day]} ${formatHour(time)}: ${firstName(name ?? "")}.`
          : `${WEEKDAY_SHORT[day]} ${formatHour(time)} sem aula.`,
      )
      router.refresh()
    })
  }

  return (
    <Card title="Quem dá aula em cada horário" description="Um horário por vez, com até 4 alunos. Toque no nome para trocar.">
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Dia da semana">
        {openDays.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === day}
            onClick={() => setDay(d)}
            className={cn(
              "min-h-tap shrink-0 rounded-full border px-4 text-sm font-semibold",
              d === day ? "border-foreground bg-foreground text-background" : "border-input bg-background",
            )}
          >
            {WEEKDAY_SHORT[d]}
          </button>
        ))}
      </div>
      {times.length === 0 ? (
        <p className="text-muted-foreground">O estúdio está fechado neste dia. Ajuste o funcionamento abaixo.</p>
      ) : (
        <ul className="grid gap-3" role="tabpanel" aria-label={WEEKDAY_LONG[day]}>
          {times.map((time) => {
            const current = owner(time)
            const fixed = slots.find((s) => s.weekday === day && s.start_time === time)?.fixed ?? 0
            const key = `${day}-${time}`
            return (
              <li key={time} className="grid gap-3 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-[5rem_1fr] sm:items-center">
                <div className="flex items-baseline justify-between sm:block">
                  <span className="font-display text-xl font-bold">{formatHour(time)}</span>
                  {fixed > 0 && (
                    <span className="text-xs text-muted-foreground sm:block">
                      {fixed} {fixed === 1 ? "fixo" : "fixos"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={`Personal ${formatHour(time)}`}>
                  {[{ id: null as string | null, full_name: "Sem aula" }, ...staff].map((p) => (
                    <button
                      key={p.id ?? "none"}
                      type="button"
                      role="radio"
                      aria-checked={current === p.id}
                      disabled={pending === key}
                      onClick={() => assign(time, p.id)}
                      className={cn(
                        "min-h-tap rounded-full border px-4 text-sm font-semibold transition-colors",
                        current === p.id
                          ? p.id
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-muted text-muted-foreground"
                          : "border-input bg-background hover:border-foreground/40",
                      )}
                    >
                      {p.id ? firstName(p.full_name) : p.full_name}
                    </button>
                  ))}
                  {pending === key && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Salvando" />}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/** Dias e horário de funcionamento + duração da aula. */
export function HoursEditor({ businessHours, duration }: { businessHours: Hours[]; duration: number }) {
  const router = useRouter()
  const [rows, setRows] = useState(
    ORDER.map((weekday) => {
      const h = businessHours.find((x) => x.weekday === weekday)
      return { weekday, open: !!h, opens_at: h?.opens_at ?? "06:00", closes_at: h?.closes_at ?? "21:00" }
    }),
  )
  const [minutes, setMinutes] = useState(String(duration))
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const set = (weekday: number, patch: Partial<(typeof rows)[number]>) =>
    setRows((r) => r.map((x) => (x.weekday === weekday ? { ...x, ...patch } : x)))

  return (
    <Card title="Funcionamento" description="Define os horários possíveis na grade acima.">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const res = await saveBusinessHours(rows, Number(minutes))
            if (!res.ok) return setError(res.message)
            setError(undefined)
            toast.success("Funcionamento salvo.")
            router.refresh()
          })
        }}
      >
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li key={r.weekday} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
              <label className="flex min-h-tap items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={r.open}
                  onChange={(e) => set(r.weekday, { open: e.target.checked })}
                  className="size-5 accent-[var(--brand)]"
                />
                {WEEKDAY_SHORT[r.weekday]}
              </label>
              {r.open ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label={`${WEEKDAY_LONG[r.weekday]}: abre`}
                    value={r.opens_at}
                    onChange={(e) => set(r.weekday, { opens_at: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">às</span>
                  <Input
                    type="time"
                    aria-label={`${WEEKDAY_LONG[r.weekday]}: fecha`}
                    value={r.closes_at}
                    onChange={(e) => set(r.weekday, { closes_at: e.target.value })}
                    className="w-28"
                  />
                </div>
              ) : (
                <span className="text-muted-foreground">Fechado</span>
              )}
            </li>
          ))}
        </ul>
        <div className="grid max-w-xs gap-1.5">
          <Label htmlFor="duration" className="font-semibold">
            Duração da aula
          </Label>
          <div className="flex gap-2">
            {["45", "60", "90"].map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={minutes === m}
                onClick={() => setMinutes(m)}
                className={cn(
                  "min-h-tap flex-1 rounded-lg border font-semibold",
                  minutes === m ? "border-foreground bg-foreground text-background" : "border-input bg-background",
                )}
              >
                {m} min
              </button>
            ))}
          </div>
          <input id="duration" type="hidden" value={minutes} />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Salvar funcionamento
        </Button>
      </form>
    </Card>
  )
}

/** Feriados e dias em que o estúdio fecha: as aulas do dia viram "feriado". */
export function ClosuresEditor({ closures, today }: { closures: { date: string; reason: string }[]; today: string }) {
  const router = useRouter()
  const [date, setDate] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()

  return (
    <Card title="Feriados e dias fechados" description="As aulas desses dias aparecem como feriado na agenda.">
      <form
        className="grid gap-3 sm:grid-cols-[11rem_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const res = await addClosure(date, reason)
            if (!res.ok) return setError(res.message)
            setError(undefined)
            setDate("")
            setReason("")
            toast.success("Feriado marcado.")
            router.refresh()
          })
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="closure-date" className="font-semibold">
            Data
          </Label>
          <Input id="closure-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <TextField id="closure-reason" label="Motivo" value={reason} onChange={setReason} placeholder="Ex.: Aniversário da cidade" />
        <Button type="submit" disabled={pending || !date}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Marcar
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {closures.length === 0 ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <CalendarX className="size-5" aria-hidden /> Nenhum feriado marcado daqui para frente.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {closures.map((c) => (
            <li key={c.date} className="flex items-center gap-3 px-3 py-2">
              <span className="w-28 font-semibold">{formatDayShort(c.date)}</span>
              <span className="flex-1 text-muted-foreground">{c.reason}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover feriado de ${formatDate(c.date)}`}
                onClick={() =>
                  start(async () => {
                    const res = await removeClosure(c.date)
                    if (!res.ok) return void toast.error(res.message)
                    toast.success("Feriado removido. As aulas desse dia voltaram ao normal.")
                    router.refresh()
                  })
                }
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
