import { ChevronRight, HeartPulse, Plus, Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { StudentStatusBadge } from "@/components/feedback/status-badge"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { requireStaff } from "@/lib/auth"
import { formatPhone, initials } from "@/lib/format"
import type { Enums } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Alunos" }

const FILTERS: { id: "todos" | Enums<"student_status">; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "ativo", label: "Ativos" },
  { id: "aguardando", label: "Aguardando" },
  { id: "convidado", label: "Link enviado" },
  { id: "pausado", label: "Pausados" },
  { id: "inativo", label: "Inativos" },
]

export default async function AlunosPage({ searchParams }: PageProps<"/alunos">) {
  const staff = await requireStaff()
  const { status } = await searchParams
  const isAdmin = staff.role === "admin"
  const supabase = await createClient()
  // O RLS já restringe: personal só recebe os próprios alunos.
  const { data: all, error } = await supabase
    .from("students")
    .select("id, full_name, whatsapp, status, personal:profiles!students_personal_id_fkey(full_name), student_health(requires_clearance, health_notes)")
    .is("anonymized_at", null)
    .order("full_name")
  if (error) throw error

  const active = FILTERS.find((f) => f.id === status)?.id ?? (isAdmin ? "todos" : "ativo")
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, f.id === "todos" ? all.length : all.filter((s) => s.status === f.id).length]))
  const students = active === "todos" ? all : all.filter((s) => s.status === active)

  return (
    <>
      <PageHeader
        title="Alunos"
        description={isAdmin ? `${counts.ativo} ativos` : `${counts.ativo} alunos ativos com você`}
        actions={
          isAdmin && (
            <Button asChild size="lg" className="hidden md:inline-flex">
              <Link href="/alunos/novo">
                <Plus aria-hidden /> Novo aluno
              </Link>
            </Button>
          )
        }
      />

      {all.length > 0 && (
        <nav aria-label="Filtrar por status" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {FILTERS.filter((f) => f.id === "todos" || f.id === active || counts[f.id]).map((f) => (
            <Link
              key={f.id}
              href={f.id === (isAdmin ? "todos" : "ativo") ? "/alunos" : `/alunos?status=${f.id}`}
              aria-current={active === f.id ? "page" : undefined}
              className={cn(
                "flex min-h-tap shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                active === f.id ? "border-foreground bg-foreground text-background" : "border-input bg-card hover:border-foreground/40",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-xs", active === f.id ? "bg-background/20" : "bg-secondary")}>{counts[f.id]}</span>
            </Link>
          ))}
        </nav>
      )}

      {all.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum aluno ainda"
          description={isAdmin ? "Envie o primeiro link de cadastro para um aluno novo." : "Quando o Gabriel vincular alunos a você, eles aparecem aqui."}
          action={
            isAdmin && (
              <Button asChild size="lg">
                <Link href="/alunos/novo">
                  <Plus aria-hidden /> Novo aluno
                </Link>
              </Button>
            )
          }
        />
      ) : students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-muted-foreground">
          Nenhum aluno com esse status.
        </p>
      ) : (
        <ul className={cn("divide-y divide-border overflow-hidden rounded-xl border border-border bg-card", isAdmin && "mb-20 md:mb-0")}>
          {students.map((s) => {
            const healthFlag = s.student_health?.requires_clearance || !!s.student_health?.health_notes
            return (
              <li key={s.id}>
                <Link
                  href={`/alunos/${s.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold">
                    {initials(s.full_name)}
                  </span>
                  <span className="grid min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate font-semibold">
                      {s.full_name}
                      {healthFlag && <HeartPulse className="size-4 shrink-0 text-warning" aria-label="Tem observação de saúde" />}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {formatPhone(s.whatsapp)}
                      {isAdmin && s.personal?.full_name && ` · com ${s.personal.full_name.split(" ")[0]}`}
                    </span>
                  </span>
                  {s.status !== "ativo" && <StudentStatusBadge status={s.status} className="shrink-0" />}
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {/* Celular: ação principal ao alcance do polegar */}
      {isAdmin && (
        <Link
          href="/alunos/novo"
          className="fixed right-4 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1rem)] z-30 flex h-tap-lg items-center gap-2 rounded-full bg-brand px-5 font-semibold text-brand-foreground shadow-lg md:hidden"
        >
          <Plus className="size-5" aria-hidden /> Novo aluno
        </Link>
      )}
    </>
  )
}
