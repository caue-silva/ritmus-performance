import { ArrowLeft, MessageCircle } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { StudentStatusBadge } from "@/components/feedback/status-badge"
import { Button } from "@/components/ui/button"
import { requireStaff } from "@/lib/auth"
import { formatPhone } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Aluno" }

export default async function AlunoPage({ params }: PageProps<"/alunos/[id]">) {
  await requireStaff()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const supabase = await createClient()
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, whatsapp, status")
    .eq("id", id)
    .maybeSingle()
  // Aluno de outro personal: o RLS não devolve nada → "não encontrado".
  if (!student) notFound()

  return (
    <>
      <Button asChild variant="ghost" className="-ml-3 mb-2">
        <Link href="/alunos">
          <ArrowLeft /> Alunos
        </Link>
      </Button>
      <div className="mb-6 grid gap-2">
        <h1 className="font-display text-3xl font-bold uppercase md:text-4xl">{student.full_name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <StudentStatusBadge status={student.status} />
          <span className="text-muted-foreground">{formatPhone(student.whatsapp)}</span>
        </div>
      </div>
      <Button asChild variant="outline" size="lg">
        <a href={`https://wa.me/55${student.whatsapp}`} target="_blank" rel="noreferrer">
          <MessageCircle /> Conversar no WhatsApp
        </a>
      </Button>
      <p className="mt-8 text-muted-foreground">A ficha completa, a evolução e a presença chegam nas próximas etapas.</p>
    </>
  )
}
