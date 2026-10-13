import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { CampaignForm } from "@/features/campanhas/components/campaign-form"
import { requireAdmin } from "@/lib/auth"
import { addDays, todaySP } from "@/lib/dates"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Nova campanha" }

export default async function NovaCampanhaPage() {
  await requireAdmin()
  const today = todaySP()
  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" className="-ml-3 mb-2">
        <Link href="/campanhas">
          <ArrowLeft /> Campanhas
        </Link>
      </Button>
      <PageHeader title="Nova campanha" />
      <CampaignForm
        id={null}
        initial={{ title: "", body: "", imageUrl: null, linkUrl: "", startsOn: formatDate(today), endsOn: formatDate(addDays(today, 30)), referralBonus: false }}
      />
    </div>
  )
}
