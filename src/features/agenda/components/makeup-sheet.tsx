"use client"

import { Check, Search } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { ActionSheet } from "@/components/feedback/action-sheet"
import { toastWithUndo } from "@/components/feedback/undo-toast"
import { Input } from "@/components/ui/input"
import { firstName } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

import { addMakeup, removeMakeup } from "../actions"

type Option = { id: string; full_name: string; owner_name: string | null; is_mine: boolean }

/** Registrar reposição: o aluno combinou com o personal; aqui só se encaixa na aula. */
export function MakeupSheet({ sessionId, onClose, onAdded }: { sessionId: string; onClose: () => void; onAdded: () => void }) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<Option[]>([])
  const [loaded, setLoaded] = useState(false)
  const [picked, setPicked] = useState<Option | null>(null)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const request = useRef(0)

  const search = async (q: string) => {
    const id = ++request.current
    const { data, error } = await createClient().rpc("search_students_for_makeup", { p_session_id: sessionId, q })
    if (id !== request.current) return
    if (error) setError("Não deu para buscar os alunos. Confira a internet.")
    setOptions(data ?? [])
    setLoaded(true)
  }

  // Lista inicial (alunos do próprio personal primeiro).
  useEffect(() => {
    let alive = true
    createClient()
      .rpc("search_students_for_makeup", { p_session_id: sessionId, q: "" })
      .then(({ data }) => {
        if (!alive) return
        setOptions(data ?? [])
        setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [sessionId])

  const submit = () => {
    if (!picked) return setError("Escolha o aluno da reposição.")
    start(async () => {
      const res = await addMakeup(sessionId, picked.id)
      if (!res.ok) return setError(res.message)
      onClose()
      onAdded()
      toastWithUndo(`Reposição de ${firstName(picked.full_name)} registrada.`, async () => {
        const undo = await removeMakeup(res.data.attendanceId)
        if (!undo.ok) toast.error(undo.message)
        onAdded()
      })
    })
  }

  return (
    <ActionSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Adicionar reposição"
      description="Encaixe aqui o aluno que combinou a reposição com você."
      submitLabel={picked ? `Registrar reposição de ${firstName(picked.full_name)}` : "Registrar reposição"}
      submitDisabled={!picked}
      onSubmit={submit}
      pending={pending}
      error={error}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          aria-label="Buscar aluno"
          placeholder="Buscar aluno pelo nome"
          className="pl-10"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(undefined)
            void search(e.target.value)
          }}
          data-autofocus
        />
      </div>
      <ul role="listbox" aria-label="Alunos" className="grid gap-1">
        {loaded && options.length === 0 && (
          <li className="px-1 py-4 text-muted-foreground">Nenhum aluno ativo encontrado{query ? ` para “${query}”` : ""}.</li>
        )}
        {options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              role="option"
              aria-selected={picked?.id === o.id}
              onClick={() => {
                setPicked(o)
                setError(undefined)
              }}
              className={cn(
                "flex min-h-tap-lg w-full items-center gap-3 rounded-lg border px-3 text-left transition-colors",
                picked?.id === o.id ? "border-foreground bg-foreground text-background" : "border-transparent hover:bg-muted",
              )}
            >
              <span className="grid flex-1">
                <span className="font-semibold">{o.full_name}</span>
                <span className={cn("text-sm", picked?.id === o.id ? "text-background/80" : "text-muted-foreground")}>
                  {o.is_mine ? "Seu aluno" : o.owner_name ? `Aluno de ${firstName(o.owner_name)}` : "Sem personal"}
                </span>
              </span>
              {picked?.id === o.id && <Check className="size-5" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </ActionSheet>
  )
}
