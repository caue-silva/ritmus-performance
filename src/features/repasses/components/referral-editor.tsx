"use client"

import { Gift } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { ChipToggle } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { firstName } from "@/lib/format"

import { setReferredBy } from "../actions"

export type Referrer = { id: string; full_name: string }

/** Escolha de quem trouxe o aluno: "ninguém" = veio pelo estúdio. */
export function ReferrerChips({ value, onChange, people }: { value: string | null; onChange: (id: string | null) => void; people: Referrer[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ChipToggle pressed={value === null} onPressedChange={() => onChange(null)}>
        Veio pelo estúdio
      </ChipToggle>
      {people.map((p) => (
        <ChipToggle key={p.id} pressed={value === p.id} onPressedChange={() => onChange(p.id)}>
          {firstName(p.full_name)}
        </ChipToggle>
      ))}
    </div>
  )
}

/** Na ficha do aluno (admin): mostra e muda quem trouxe. Conta para o bônus de campanha. */
export function ReferralEditor({ studentId, value, people }: { studentId: string; value: string | null; people: Referrer[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(value)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const current = people.find((p) => p.id === value)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
      <p className="flex items-center gap-2">
        <Gift className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">Quem trouxe:</span>
        <span className="font-semibold">{current ? current.full_name : "veio pelo estúdio"}</span>
      </p>
      <Button
        variant="outline"
        onClick={() => {
          setChoice(value)
          setError(undefined)
          setOpen(true)
        }}
      >
        Mudar
      </Button>
      {open && (
        <ActionSheet
          open
          onOpenChange={setOpen}
          title="Quem trouxe o aluno"
          description="Em campanha com bônus de indicação, a primeira mensalidade paga vai inteira para quem trouxe."
          submitLabel="Salvar"
          pending={pending}
          error={error}
          onSubmit={() =>
            start(async () => {
              const res = await setReferredBy(studentId, choice)
              if (!res.ok) return setError(res.message)
              setOpen(false)
              toast.success("Indicação salva.")
              router.refresh()
            })
          }
        >
          <ReferrerChips value={choice} onChange={setChoice} people={people} />
        </ActionSheet>
      )}
    </div>
  )
}
