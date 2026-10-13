import type { Metadata } from "next"

import { PageHeader } from "@/components/shell/page-header"
import { TeamList } from "@/features/equipe/components/team-list"
import { getAwards, getCurrentRates } from "@/features/repasses/queries"
import { requireAdmin } from "@/lib/auth"
import { summarizeSchedule } from "@/lib/format"
import { siteUrl } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { generateTempPassword } from "@/lib/tokens"

export const metadata: Metadata = { title: "Equipe" }

export default async function EquipePage() {
  const me = await requireAdmin()
  const supabase = await createClient()
  const [{ data: staff }, { data: students }, { data: slots }, rates, awards] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("full_name"),
    supabase.from("students").select("personal_id").eq("status", "ativo"),
    supabase.from("time_slots").select("personal_id, weekday, start_time").eq("active", true),
    getCurrentRates(),
    getAwards(),
  ])

  const members = (staff ?? []).map((p) => ({
    id: p.id,
    avatar_url: p.avatar_url,
    full_name: p.full_name,
    email: p.email,
    whatsapp: p.whatsapp,
    role: p.role,
    active: p.active,
    must_change_password: p.must_change_password,
    isMe: p.id === me.id,
    activeStudents: (students ?? []).filter((s) => s.personal_id === p.id).length,
    schedule: summarizeSchedule((slots ?? []).filter((s) => s.personal_id === p.id)),
    commission: rates.get(p.id) ?? { rate_bp: 0, valid_from: null },
    joinsRanking: p.joins_ranking ?? p.role === "personal",
    awards: awards.filter((a) => a.personal_id === p.id).map((a) => a.month),
  }))

  return (
    <>
      <PageHeader title="Equipe" description="Contas dos personais, acesso, horários e comissão de cada um." />
      <TeamList members={members} suggestedPassword={generateTempPassword()} loginUrl={`${siteUrl()}/login`} />
    </>
  )
}
