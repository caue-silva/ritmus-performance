"use client"

import { Loader2, Search, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { formatPhone, STUDENT_STATUS_LABEL } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

type Result = Database["public"]["Functions"]["search_students"]["Returns"][number]

/** Busca rápida de aluno, aberta de qualquer tela (botão no topo ou tecla "/"). */
export function StudentSearch({ variant }: { variant: "icon" | "bar" }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const router = useRouter()
  const requestId = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]")
      if ((e.key === "/" && !typing) || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Busca com espera curta enquanto a pessoa digita; só a última resposta vale.
  const search = (value: string) => {
    setQuery(value)
    clearTimeout(timer.current)
    const q = value.trim()
    const id = ++requestId.current
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    timer.current = setTimeout(async () => {
      const { data, error } = await createClient().rpc("search_students", { q, max_results: 8 })
      if (id !== requestId.current) return
      setFailed(Boolean(error))
      setResults(data ?? [])
      setLoading(false)
    }, 180)
  }

  const go = (id: string) => {
    setOpen(false)
    search("")
    router.push(`/alunos/${id}`)
  }

  return (
    <>
      {variant === "icon" ? (
        <Button variant="ghost" size="icon" aria-label="Buscar aluno" onClick={() => setOpen(true)}>
          <Search />
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-tap w-full max-w-md items-center gap-3 rounded-lg border border-input bg-card px-3 text-left text-muted-foreground transition-colors hover:border-foreground/30"
        >
          <Search className="size-5" aria-hidden />
          <span className="flex-1">Buscar aluno…</span>
          <kbd className="rounded border border-border px-1.5 text-xs">/</kbd>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 gap-0 rounded-none p-0 sm:max-w-none",
            "md:top-[12%] md:left-1/2 md:h-auto md:max-w-lg md:-translate-x-1/2 md:rounded-xl",
          )}
        >
          <DialogTitle className="sr-only">Buscar aluno</DialogTitle>
          <DialogDescription className="sr-only">Digite o nome ou o telefone do aluno.</DialogDescription>
          <Command shouldFilter={false} className="rounded-none! md:rounded-xl!">
            <div className="flex items-center gap-1 p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <div className="flex-1 [&_[data-slot=command-input-wrapper]]:p-0">
                <CommandInput
                  value={query}
                  onValueChange={search}
                  placeholder="Nome ou telefone do aluno"
                  className="text-base"
                  autoFocus
                />
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)} className="md:hidden">
                Fechar
              </Button>
            </div>
            <CommandList className="max-h-none flex-1 md:max-h-96">
              {loading && (
                <div className="flex items-center gap-2 px-4 py-6 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Buscando…
                </div>
              )}
              {!loading && query.trim().length < 2 && (
                <p className="px-4 py-6 text-muted-foreground">Digite pelo menos 2 letras do nome ou 4 números do telefone.</p>
              )}
              {!loading && query.trim().length >= 2 && (
                <CommandEmpty className="px-4 py-6 text-left text-base text-muted-foreground">
                  {failed
                    ? "Não deu para buscar agora. Confira sua internet e tente de novo."
                    : `Nenhum aluno encontrado para “${query.trim()}”.`}
                </CommandEmpty>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup heading="Alunos">
                  {results.map((s) => (
                    <CommandItem key={s.id} value={s.id} onSelect={() => go(s.id)} className="min-h-14 gap-3 px-3">
                      <UserRound className="size-5 text-muted-foreground" aria-hidden />
                      <div className="grid flex-1">
                        <span className="text-base font-semibold">{s.full_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatPhone(s.whatsapp)} · {STUDENT_STATUS_LABEL[s.status]}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
