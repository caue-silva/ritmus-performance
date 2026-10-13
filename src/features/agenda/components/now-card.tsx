import { ChevronRight, Timer } from "lucide-react"
import Link from "next/link"

import { addMinutes } from "@/lib/dates"
import { formatHour } from "@/lib/format"

import type { NowState } from "../queries"

/** "Seu horário agora" na Central de tarefas: o Gabriel também dá aula. */
export function NowCard({ now }: { now: NowState }) {
  if (now.kind === "nenhuma") return null
  const s = now.session
  return (
    <Link
      href="/agora"
      className="mb-5 flex items-center gap-4 rounded-2xl bg-sidebar p-4 text-sidebar-foreground transition-opacity hover:opacity-95"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground">
        <Timer className="size-6" aria-hidden />
      </span>
      <span className="grid flex-1">
        <span className="text-sm text-sidebar-foreground/75">{now.kind === "agora" ? "Sua aula agora" : "Sua próxima aula"}</span>
        <span className="font-display text-2xl leading-tight font-bold">
          {formatHour(s.start_time)}–{formatHour(addMinutes(s.start_time, now.duration))}
          <span className="ml-2 text-lg text-brand">
            {s.taken}/{s.capacity}
          </span>
        </span>
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold">
        {now.kind === "agora" ? "Fazer check-in" : "Abrir"} <ChevronRight className="size-5" aria-hidden />
      </span>
    </Link>
  )
}
