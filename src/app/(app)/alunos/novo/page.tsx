import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { PreRegistrationForm } from "@/features/alunos/components/pre-registration-form"
import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Novo aluno" }

export default async function NovoAlunoPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: referrers } = await supabase.from("profiles").select("id, full_name").eq("role", "personal").eq("active", true).order("full_name")
  return (
    <div className="mx-auto max-w-lg">
      <Button asChild variant="ghost" className="-ml-3 mb-2">
        <Link href="/alunos">
          <ArrowLeft /> Alunos
        </Link>
      </Button>
      <PageHeader
        title="Novo aluno"
        description="Coloque o nome e o WhatsApp. O aluno recebe um link para preencher o resto do cadastro pelo celular."
      />
      <PreRegistrationForm referrers={referrers ?? []} />
    </div>
  )
}
