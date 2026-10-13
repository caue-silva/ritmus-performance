"use client"

import { RotateCcw, WifiOff } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"

export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <EmptyState
      icon={WifiOff}
      title="Algo deu errado"
      description="Não conseguimos carregar esta tela. Confira sua internet e tente de novo. Se continuar, avise o Gabriel."
      action={
        <Button size="lg" onClick={() => retry()}>
          <RotateCcw /> Tentar de novo
        </Button>
      }
    />
  )
}
