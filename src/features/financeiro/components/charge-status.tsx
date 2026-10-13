import { cn } from "@/lib/utils"

import { STATUS_LABEL, type EffectiveStatus } from "../lib"

const TONE: Record<EffectiveStatus, string> = {
  pendente: "bg-secondary text-secondary-foreground",
  vencido: "bg-destructive/10 text-destructive",
  pago: "bg-success-soft text-success",
  cancelado: "bg-muted text-muted-foreground line-through",
}

export function ChargeStatusBadge({ status, daysOverdue, className }: { status: EffectiveStatus; daysOverdue?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold", TONE[status], className)}>
      {STATUS_LABEL[status]}
      {status === "vencido" && daysOverdue ? ` · ${daysOverdue} ${daysOverdue === 1 ? "dia" : "dias"}` : ""}
    </span>
  )
}
