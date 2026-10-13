import { ChevronRight, Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { StudentStatusBadge } from "@/components/feedback/status-badge"
import { PageHeader } from "@/components/shell/page-header"
import { requireStaff } from "@/lib/auth"
import { formatPhone, initials } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Alunos" }

export default async function AlunosPage() {
  const staff = await requireStaff()
  const supabase = await createClient()
  // O RLS já restringe: personal só recebe os próprios alunos.
  const { data: students, error } = await supabase
    .from("students")
    .select("id, full_name, whatsapp, status")
    .is("anonymized_at", null)
    .order("full_name")
  if (error) throw error

  const isAdmin = staff.role === "admin"
  return (
    <>
      <PageHeader
        title="Alunos"
        description={isAdmin ? `${students.length} no total` : `${students.length} alunos com você`}
      />
      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum aluno ainda"
          description={
            isAdmin
              ? "Envie o primeiro link de cadastro para um aluno novo."
              : "Quando o Gabriel vincular alunos a você, eles aparecem aqui."
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {students.map((s) => (
            <li key={s.id}>
              <Link
                href={`/alunos/${s.id}`}
                className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold">
                  {initials(s.full_name)}
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-semibold">{s.full_name}</span>
                  <span className="text-sm text-muted-foreground">{formatPhone(s.whatsapp)}</span>
                </span>
                {s.status !== "ativo" && <StudentStatusBadge status={s.status} className="shrink-0" />}
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
