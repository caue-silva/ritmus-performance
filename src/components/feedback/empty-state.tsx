import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Estado vazio: sempre diz o que está acontecendo e o que fazer a seguir. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  tone?: "neutral" | "positive"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full",
          tone === "positive" ? "bg-success-soft text-success" : "bg-brand-soft text-brand-ink",
        )}
      >
        <Icon className="size-7" aria-hidden />
      </span>
      <h2 className="font-display text-2xl font-bold uppercase">{title}</h2>
      {description && <p className="max-w-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
