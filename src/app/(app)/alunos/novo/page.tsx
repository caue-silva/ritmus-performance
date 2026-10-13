import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { PreRegistrationForm } from "@/features/alunos/components/pre-registration-form"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = { title: "Novo aluno" }

export default async function NovoAlunoPage() {
  await requireAdmin()
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
      <PreRegistrationForm />
    </div>
  )
}
