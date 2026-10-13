import type { Enums } from "@/lib/supabase/database.types"
import { STUDENT_STATUS_LABEL } from "@/lib/format"
import { cn } from "@/lib/utils"

const tone: Record<Enums<"student_status">, string> = {
  ativo: "bg-success-soft text-success",
  aguardando: "bg-warning-soft text-warning",
  convidado: "bg-secondary text-secondary-foreground",
  pausado: "bg-secondary text-secondary-foreground",
  inativo: "bg-secondary text-muted-foreground",
}

export function StudentStatusBadge({ status, className }: { status: Enums<"student_status">; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold", tone[status], className)}>
      {STUDENT_STATUS_LABEL[status]}
    </span>
  )
}
