import { PartyPopper } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { firstName } from "@/lib/format"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = { title: "Tarefas" }

export default async function TarefasPage() {
  const staff = await requireAdmin()
  return (
    <>
      <PageHeader title="Tarefas de hoje" description={`Oi, ${firstName(staff.full_name)}. Aqui fica tudo o que precisa da sua atenção.`} />
      <EmptyState
        icon={PartyPopper}
        tone="positive"
        title="Tudo em dia por hoje"
        description="Novos cadastros, liberações médicas e cobranças vão aparecer aqui assim que surgirem."
      />
    </>
  )
}
