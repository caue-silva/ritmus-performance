"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { cn } from "@/lib/utils"

const options = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
] as const

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  // Evita divergência de hidratação: o tema só é conhecido no navegador.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  return (
    <div role="radiogroup" aria-label="Aparência" className="grid grid-cols-3 gap-2">
      {options.map(({ value, label, icon: Icon }) => {
        const checked = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => setTheme(value)}
            className={cn(
              "flex min-h-tap-lg flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm font-semibold transition-colors",
              checked ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
