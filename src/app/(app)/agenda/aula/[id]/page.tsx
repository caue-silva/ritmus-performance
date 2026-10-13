import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { SessionView } from "@/features/agenda/components/session-view"
import { getClassDuration, getRoster, getSession } from "@/features/agenda/queries"
import { requireStaff } from "@/lib/auth"
import { todaySP } from "@/lib/dates"

export const metadata: Metadata = { title: "Horário" }

export default async function AulaPage({ params }: PageProps<"/agenda/aula/[id]">) {
  const staff = await requireStaff()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  // RLS: personal só encontra as próprias aulas.
  const [session, duration] = await Promise.all([getSession(id), getClassDuration()])
  if (!session) notFound()
  const roster = await getRoster(id)
  const isAdmin = staff.role === "admin"

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" className="-ml-3 mb-3">
        <Link href={`/agenda?data=${session.date}`}>
          <ArrowLeft /> Agenda
        </Link>
      </Button>
      <SessionView
        session={session}
        roster={roster}
        duration={duration}
        today={todaySP()}
        canManage={isAdmin || session.personal_id === staff.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
