import { Wallet } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/feedback/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = { title: "Financeiro" }

export default async function Page() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Financeiro" />
      <EmptyState icon={Wallet} title="Financeiro em preparação" description="As mensalidades, o Pix copia e cola e a cobrança pelo WhatsApp chegam aqui." />
    </>
  )
}
