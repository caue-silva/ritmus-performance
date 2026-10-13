import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { CampaignForm } from "@/features/campanhas/components/campaign-form"
import { getCampaign } from "@/features/campanhas/queries"
import { requireAdmin } from "@/lib/auth"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Campanha" }

export default async function CampanhaPage({ params }: PageProps<"/campanhas/[id]">) {
  await requireAdmin()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const c = await getCampaign(id)
  if (!c) notFound()
  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" className="-ml-3 mb-2">
        <Link href="/campanhas">
          <ArrowLeft /> Campanhas
        </Link>
      </Button>
      <PageHeader title="Editar campanha" />
      <CampaignForm
        id={c.id}
        initial={{
          title: c.title,
          body: c.body ?? "",
          imageUrl: c.image_url,
          linkUrl: c.link_url ?? "",
          startsOn: formatDate(c.starts_on),
          endsOn: formatDate(c.ends_on),
          referralBonus: c.referral_bonus,
        }}
      />
    </div>
  )
}
