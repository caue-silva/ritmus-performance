import { LineChart } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = { title: "Painel" }

export default async function Page() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Painel" />
      <EmptyState icon={LineChart} title="Painel em preparação" description="Alunos ativos, ocupação dos horários e receita do mês vão aparecer aqui." />
    </>
  )
}
