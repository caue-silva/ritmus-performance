import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { ClosuresEditor, HoursEditor, SlotsEditor } from "@/features/agenda/components/schedule-settings"
import { requireAdmin } from "@/lib/auth"
import { todaySP } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Horários" }

export default async function HorariosPage({ searchParams }: PageProps<"/configuracoes/horarios">) {
  await requireAdmin()
  const { dia } = await searchParams
  const supabase = await createClient()
  const today = todaySP()
  const [hours, settings, slots, staff, enrollments, closures] = await Promise.all([
    supabase.from("business_hours").select("*").order("weekday"),
    supabase.from("agenda_settings").select("class_duration_min").single(),
    supabase.from("time_slots").select("id, weekday, start_time, personal_id").eq("active", true),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("role").order("full_name"),
    supabase.from("enrollments").select("time_slot_id").or(`ends_on.is.null,ends_on.gt.${today}`),
    supabase.from("closures").select("date, reason").gte("date", today).order("date"),
  ])

  const fixed = new Map<string, number>()
  for (const e of enrollments.data ?? []) fixed.set(e.time_slot_id, (fixed.get(e.time_slot_id) ?? 0) + 1)

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <Button asChild variant="ghost" className="-ml-3 mb-2">
          <Link href="/configuracoes">
            <ArrowLeft /> Configurações
          </Link>
        </Button>
        <PageHeader title="Horários" description="Quando o estúdio abre, quem dá aula em cada horário e os feriados." className="mb-0" />
      </div>
      <SlotsEditor
        initialWeekday={typeof dia === "string" ? Number(dia) : undefined}
        businessHours={(hours.data ?? []).map((h) => ({ weekday: h.weekday, opens_at: h.opens_at.slice(0, 5), closes_at: h.closes_at.slice(0, 5) }))}
        duration={settings.data?.class_duration_min ?? 60}
        slots={(slots.data ?? []).map((s) => ({
          weekday: s.weekday,
          start_time: s.start_time.slice(0, 5),
          personal_id: s.personal_id,
          fixed: fixed.get(s.id) ?? 0,
        }))}
        staff={staff.data ?? []}
      />
      <HoursEditor
        businessHours={(hours.data ?? []).map((h) => ({ weekday: h.weekday, opens_at: h.opens_at.slice(0, 5), closes_at: h.closes_at.slice(0, 5) }))}
        duration={settings.data?.class_duration_min ?? 60}
      />
      <ClosuresEditor closures={closures.data ?? []} today={today} />
    </div>
  )
}
