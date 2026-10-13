"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

/**
 * Painel de ação: sobe de baixo no celular (ao alcance do polegar) e abre na
 * lateral no tablet/computador. O botão principal fica sempre visível embaixo.
 */
export function ActionSheet({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  pending,
  submitDisabled,
  error,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  submitLabel: string
  onSubmit: () => void
  pending?: boolean
  submitDisabled?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}) {
  const desktop = useMediaQuery("(min-width: 768px)")
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={cn(
          "gap-0 p-0",
          desktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl",
          className,
        )}
      >
        <SheetHeader className="border-b border-border px-5 pt-5 pb-4">
          <SheetTitle className="pr-10 font-display text-2xl font-bold uppercase">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-base">{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          noValidate
        >
          <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-5 py-5">{children}</div>
          <div className="grid gap-3 border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={pending || submitDisabled}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
