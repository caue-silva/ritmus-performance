"use client"

import { Download, Share, X } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

const DISMISS_KEY = "ritmus:instalar-dispensado"

const subscribeNothing = () => () => {}
function useInstallState() {
  const standalone = useSyncExternalStore(
    subscribeNothing,
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => true,
  )
  const ios = useSyncExternalStore(subscribeNothing, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false)
  const [prompt, setPrompt] = useState<PromptEvent | null>(null)
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as PromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])
  return { standalone, ios, prompt, setPrompt }
}

/** Seção fixa (Minha conta): instalar o app na tela inicial. */
export function InstallAppSection() {
  const { standalone, ios, prompt, setPrompt } = useInstallState()
  if (standalone) return <p className="text-muted-foreground">O app já está instalado neste aparelho. ✓</p>
  if (prompt) {
    return (
      <Button
        size="lg"
        onClick={async () => {
          await prompt.prompt()
          setPrompt(null)
        }}
      >
        <Download aria-hidden /> Instalar o app
      </Button>
    )
  }
  return (
    <p className="text-muted-foreground">
      {ios ? (
        <>
          No iPhone: toque em <Share className="inline size-4" aria-label="Compartilhar" /> (Compartilhar) e depois em “Adicionar à Tela de
          Início”.
        </>
      ) : (
        "No celular: abra o menu do navegador (⋮) e toque em “Instalar app” ou “Adicionar à tela inicial”."
      )}
    </p>
  )
}

/** Convite discreto na tela inicial, só no celular e até a pessoa dispensar. */
export function InstallBanner() {
  const { standalone, ios, prompt, setPrompt } = useInstallState()
  const dismissedStored = useSyncExternalStore(
    subscribeNothing,
    () => {
      try {
        return localStorage.getItem(DISMISS_KEY) === "1"
      } catch {
        return true
      }
    },
    () => true,
  )
  const [dismissed, setDismissed] = useState(false)
  if (standalone || dismissedStored || dismissed || (!prompt && !ios)) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {}
    setDismissed(true)
  }

  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card p-3 md:hidden">
      <Logo size={40} />
      <p className="flex-1 text-sm">
        {prompt ? (
          <span className="font-semibold">Instale o Ritmus na tela inicial</span>
        ) : (
          <>
            <span className="font-semibold">Instale o Ritmus:</span> toque em <Share className="inline size-4" aria-label="Compartilhar" /> e
            “Adicionar à Tela de Início”.
          </>
        )}
      </p>
      {prompt && (
        <Button
          size="sm"
          onClick={async () => {
            await prompt.prompt()
            setPrompt(null)
            dismiss()
          }}
        >
          Instalar
        </Button>
      )}
      <Button variant="ghost" size="icon" aria-label="Dispensar" onClick={dismiss}>
        <X aria-hidden />
      </Button>
    </div>
  )
}
