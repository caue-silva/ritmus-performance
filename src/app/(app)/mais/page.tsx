import { ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { moreItems } from "@/components/shell/nav-config"
import { PageHeader } from "@/components/shell/page-header"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = { title: "Mais" }

export default async function MaisPage() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Mais" />
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {moreItems.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-4 px-4 transition-colors hover:bg-muted/60">
              <Icon className="size-6 text-brand-ink" aria-hidden />
              <span className="flex-1 text-lg font-semibold">{label}</span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
