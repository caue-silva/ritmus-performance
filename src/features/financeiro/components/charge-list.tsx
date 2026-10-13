"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { formatBRL, formatDate } from "@/lib/format"

import type { ChargeRow } from "../queries"
import { ChargeActions } from "./charge-actions"
import { ChargeStatusBadge } from "./charge-status"

/** Lista de mensalidades com as ações no próprio item (otimista + Desfazer). */
export function ChargeList({ charges, emptyText }: { charges: ChargeRow[]; emptyText: string }) {
  const router = useRouter()
  const [paid, setPaid] = useState<Set<string>>(new Set())

  if (!charges.length) {
    return <p className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-muted-foreground">{emptyText}</p>
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {charges.map((c) => {
        const status = paid.has(c.id) ? "pago" : c.effective_status
        return (
          <li key={c.id} className="grid gap-3 rounded-xl border border-border bg-card p-4">
            <Link href={`/financeiro/${c.id}`} className="flex items-start gap-3">
              <div className="grid min-w-0 flex-1 gap-1">
                <span className="truncate font-semibold">{c.full_name}</span>
                <span className="text-sm text-muted-foreground">
                  Vence {formatDate(c.due_date)}
                  {c.paid_on && status === "pago" && ` · pago em ${formatDate(c.paid_on)}`}
                </span>
              </div>
              <div className="grid justify-items-end gap-1">
                <span className="text-lg font-bold tabular-nums">{formatBRL(c.amount_cents)}</span>
                <ChargeStatusBadge status={status} daysOverdue={c.days_overdue} />
              </div>
              <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
            {status !== "pago" && (
              <ChargeActions
                charge={c}
                layout="stack"
                onConfirmed={() => setPaid((p) => new Set(p).add(c.id))}
                onUndone={() => {
                  setPaid((p) => {
                    const n = new Set(p)
                    n.delete(c.id)
                    return n
                  })
                  router.refresh()
                }}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
