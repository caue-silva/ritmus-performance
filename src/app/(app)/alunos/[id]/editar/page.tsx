import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { EditStudentForm } from "@/features/alunos/components/edit-student-form"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { maskCEP, maskPhone } from "@/lib/validation"

export const metadata: Metadata = { title: "Editar aluno" }

export default async function EditarAlunoPage({ params }: PageProps<"/alunos/[id]/editar">) {
  await requireStaff()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const supabase = await createClient()
  const { data: s } = await supabase.from("students").select("*").eq("id", id).maybeSingle()
  if (!s) notFound()

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" className="-ml-3 mb-2">
        <Link href={`/alunos/${id}`}>
          <ArrowLeft /> {s.full_name.split(" ")[0]}
        </Link>
      </Button>
      <PageHeader title="Editar dados" description={s.full_name} />
      <EditStudentForm
        studentId={id}
        initial={{
          full_name: s.full_name,
          whatsapp: maskPhone(s.whatsapp),
          email: s.email ?? "",
          cep: maskCEP(s.cep ?? ""),
          street: s.street ?? "",
          number: s.number ?? "",
          complement: s.complement ?? "",
          neighborhood: s.neighborhood ?? "",
          city: s.city ?? "",
          state: s.state ?? "",
          emergency_name: s.emergency_name ?? "",
          emergency_phone: maskPhone(s.emergency_phone ?? ""),
          emergency_relation: s.emergency_relation ?? "",
          goals_notes: s.goals_notes ?? "",
          height: s.height_cm ? String(s.height_cm).replace(".", ",") : "",
        }}
      />
    </div>
  )
}
