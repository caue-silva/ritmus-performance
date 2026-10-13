import { CalendarDays, Timer } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { InstallBanner } from "@/components/pwa/install-app"
import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { SessionView } from "@/features/agenda/components/session-view"
import { CampaignBanner } from "@/features/campanhas/components/campaign-banner"
import { getActiveCampaigns } from "@/features/campanhas/queries"
import { getNow, getRoster } from "@/features/agenda/queries"
import { requireStaff } from "@/lib/auth"
import { addMinutes, formatDayShort, minutesOf, nowTimeSP, todaySP } from "@/lib/dates"
import { firstName, formatHour } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Agora" }

export default async function AgoraPage() {
  const staff = await requireStaff()
  const [now, campaigns] = await Promise.all([getNow(staff.id), getActiveCampaigns()])
  const today = todaySP()

  if (now.kind === "nenhuma") {
    return (
      <>
        <PageHeader title="Agora" description={`Bom treino, ${firstName(staff.full_name)}!`} />
        <CampaignBanner campaigns={campaigns} />
        <EmptyState
          icon={Timer}
          title={now.today.length ? "Aulas de hoje encerradas" : "Nenhuma aula hoje"}
          description={
            now.next
              ? `Sua próxima aula é ${formatDayShort(now.next.date)} às ${formatHour(now.next.start_time)}.`
              : "Você não tem horários nos próximos dias. Fale com o Gabriel para montar sua agenda."
          }
          action={
            <Button asChild size="lg" variant="outline">
              <Link href="/agenda">
                <CalendarDays aria-hidden /> Ver agenda
              </Link>
            </Button>
          }
        />
      </>
    )
  }

  const { session, duration } = now
  const roster = await getRoster(session.id)
  const minutesToStart = minutesOf(session.start_time) - minutesOf(nowTimeSP())
  const description =
    now.kind === "agora"
      ? `Em andamento · termina às ${formatHour(addMinutes(session.start_time, duration))}`
      : minutesToStart <= 60
        ? `Começa em ${minutesToStart} min`
        : `Hoje às ${formatHour(session.start_time)}`

  return (
    <>
      <InstallBanner />
      <PageHeader title={now.kind === "agora" ? "Agora" : "Próxima aula"} description={description} className="mb-4" />
      {now.today.length > 1 && (
        <nav aria-label="Outras aulas de hoje" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {now.today.map((s) => (
            <Link
              key={s.id}
              href={s.id === session.id ? "/agora" : `/agenda/aula/${s.id}`}
              aria-current={s.id === session.id ? "page" : undefined}
              className={cn(
                "flex min-h-tap shrink-0 flex-col items-center justify-center rounded-lg border px-4 leading-tight",
                s.id === session.id ? "border-foreground bg-foreground text-background" : "border-input bg-card",
              )}
            >
              <span className="font-semibold">{formatHour(s.start_time)}</span>
              <span className="text-xs">
                {s.taken}/{s.capacity}
              </span>
            </Link>
          ))}
        </nav>
      )}
      <SessionView
        key={session.id}
        session={session}
        roster={roster}
        duration={duration}
        today={today}
        canManage
        isAdmin={staff.role === "admin"}
      />
      <CampaignBanner campaigns={campaigns} className="mt-8 mb-0" />
    </>
  )
}
