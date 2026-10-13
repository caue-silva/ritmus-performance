"use client"

import { CloudOff, RefreshCw, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { firstName } from "@/lib/format"

import { formatNumber } from "../lib"
import { discardMeasurement, flushMeasurements, SYNCED_EVENT, usePendingMeasurements } from "../offline-queue"

/**
 * Reenvio automático das medições guardadas no aparelho + aviso no topo
 * enquanto houver alguma pendente. Fica montado em todas as telas da equipe.
 */
export function PendingSync() {
  const router = useRouter()
  const pending = usePendingMeasurements()
  const [open, setOpen] = useState(false)
  const waiting = pending.filter((p) => p.state === "pendente").length
  const failed = pending.filter((p) => p.state === "erro").length

  useEffect(() => {
    void flushMeasurements()
    const onOnline = () => void flushMeasurements()
    const onSynced = (e: Event) => {
      const sent = (e as CustomEvent<{ sent: number }>).detail.sent
      toast.success(sent === 1 ? "Medição pendente enviada." : `${sent} medições pendentes enviadas.`)
      router.refresh()
    }
    window.addEventListener("online", onOnline)
    window.addEventListener(SYNCED_EVENT, onSynced)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener(SYNCED_EVENT, onSynced)
    }
  }, [router])

  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(() => void flushMeasurements(), 20_000)
    return () => clearInterval(timer)
  }, [waiting])

  if (!pending.length) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-tap items-center gap-1.5 rounded-full bg-warning-soft px-3 text-sm font-semibold text-warning"
      >
        <CloudOff className="size-4" aria-hidden />
        {failed ? `${failed} com erro` : `${waiting} pendente${waiting > 1 ? "s" : ""}`}
        <span className="sr-only"> — medições aguardando envio</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-lg gap-0 rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]">
          <SheetHeader className="border-b border-border px-5 pt-5 pb-4">
            <SheetTitle className="pr-10 font-display text-2xl font-bold uppercase">Medições no aparelho</SheetTitle>
            <SheetDescription>
              {waiting
                ? "Ficaram guardadas porque a internet falhou. Elas são enviadas sozinhas quando a conexão voltar."
                : "O servidor não aceitou estas medições. Confira e registre de novo."}
            </SheetDescription>
          </SheetHeader>
          <ul className="grid gap-2 p-4">
            {pending.map((m) => (
              <li key={m.client_id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="grid flex-1">
                  <span className="font-semibold">{firstName(m.student_name)}</span>
                  <span className="text-sm text-muted-foreground">
                    {[
                      m.weight_kg && `${formatNumber(m.weight_kg)} kg`,
                      m.waist_cm && `cintura ${formatNumber(m.waist_cm)}`,
                      m.abdomen_cm && `abdômen ${formatNumber(m.abdomen_cm)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {m.state === "erro" ? (
                    <span className="text-sm font-medium text-destructive">{m.error}</span>
                  ) : (
                    <span className="text-sm text-warning">Envio pendente</span>
                  )}
                </div>
                {m.state === "erro" && (
                  <Button variant="ghost" size="icon" aria-label="Descartar" onClick={() => discardMeasurement(m.client_id)}>
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {waiting > 0 && (
            <div className="px-4 pb-4">
              <Button size="lg" variant="outline" className="w-full" onClick={() => void flushMeasurements()}>
                <RefreshCw aria-hidden /> Tentar enviar agora
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
