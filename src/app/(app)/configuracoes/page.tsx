import { Settings } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = { title: "Configurações" }

export default async function Page() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Configurações" />
      <EmptyState icon={Settings} title="Configurações em preparação" description="Chave Pix, horários de funcionamento, feriados e mensagens do WhatsApp ficam aqui." />
    </>
  )
}
