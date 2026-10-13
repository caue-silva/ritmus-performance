import { Gift } from "lucide-react"

import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { Campaign } from "../queries"

/** Banner das campanhas no topo da tela do professor (desliza para o lado se houver mais de uma). */
export function CampaignBanner({ campaigns, className }: { campaigns: Campaign[]; className?: string }) {
  if (!campaigns.length) return null
  return (
    <section aria-label="Campanhas" className={cn("mb-5", className)}>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        {campaigns.map((c) => {
          const content = (
            <>
              {c.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- arte enviada pelo Gabriel (Storage)
                <img src={c.image_url} alt={c.title} className="aspect-[2/1] w-full rounded-t-xl bg-sidebar object-cover" />
              ) : (
                <div className="grid aspect-[2/1] w-full place-items-center rounded-t-xl bg-sidebar p-6 text-center font-display text-3xl font-bold text-sidebar-foreground uppercase">
                  {c.title}
                </div>
              )}
              <div className="grid gap-1 p-3">
                <p className="flex items-center gap-2 font-semibold">
                  {c.referral_bonus && <Gift className="size-4 shrink-0 text-brand-ink" aria-label="Campanha com bônus" />}
                  {c.title}
                </p>
                {c.body && <p className="text-sm text-muted-foreground">{c.body}</p>}
                <p className="text-xs text-muted-foreground">Até {formatDate(c.ends_on)}</p>
              </div>
            </>
          )
          return (
            <li
              key={c.id}
              className={cn("shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card", campaigns.length > 1 ? "w-[85%] md:w-[28rem]" : "w-full md:max-w-xl")}
            >
              {c.link_url ? (
                <a href={c.link_url} target="_blank" rel="noreferrer" className="block hover:opacity-95">
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
