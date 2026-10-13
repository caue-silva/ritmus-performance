import { Timer } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { firstName } from "@/lib/format"
import { requireStaff } from "@/lib/auth"

export const metadata: Metadata = { title: "Agora" }

export default async function AgoraPage() {
  const staff = await requireStaff()
  return (
    <>
      <PageHeader title="Agora" description={`Bom treino, ${firstName(staff.full_name)}!`} />
      <EmptyState
        icon={Timer}
        title="Nenhuma aula agora"
        description="Quando a agenda estiver montada, o horário em andamento (ou o próximo) aparece aqui com os alunos e o check-in."
      />
    </>
  )
}
