import { CalendarDays } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { requireStaff } from "@/lib/auth"

export const metadata: Metadata = { title: "Agenda" }

export default async function Page() {
  await requireStaff()
  return (
    <>
      <PageHeader title="Agenda" />
      <EmptyState icon={CalendarDays} title="A agenda ainda está sendo montada" description="Em breve você vê aqui os horários do dia e da semana, com as vagas de cada um." />
    </>
  )
}
