import { UsersRound } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = { title: "Equipe" }

export default async function Page() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Equipe" />
      <EmptyState icon={UsersRound} title="Equipe em preparação" description="Aqui você vai criar a conta dos personais, redefinir senhas e atribuir horários." />
    </>
  )
}
