import { getStaff } from "@/lib/auth"
import { todaySP } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"

/**
 * LGPD: exporta tudo o que o sistema guarda de um aluno (JSON). Só o admin.
 * Serve para atender a um pedido de cópia dos dados.
 */
export async function GET(_request: Request, ctx: RouteContext<"/alunos/[id]/exportar">) {
  const staff = await getStaff()
  if (!staff?.active || staff.role !== "admin") {
    return Response.json({ erro: "Só o administrador pode exportar os dados de um aluno." }, { status: 403 })
  }
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ erro: "Aluno não encontrado." }, { status: 404 })

  const supabase = await createClient()
  const { data: student } = await supabase.from("students").select("*").eq("id", id).maybeSingle()
  if (!student) return Response.json({ erro: "Aluno não encontrado." }, { status: 404 })

  const [health, billing, enrollments, attendances, measurements, charges, consents] = await Promise.all([
    supabase.from("student_health").select("parq_answers, health_notes, requires_clearance, clearance_received_on").eq("student_id", id).maybeSingle(),
    supabase.from("student_billing").select("monthly_fee_cents, due_day").eq("student_id", id).maybeSingle(),
    supabase.from("enrollments").select("starts_on, ends_on, time_slots(weekday, start_time)").eq("student_id", id),
    supabase.from("attendances").select("kind, status, checked_in_at, class_sessions(date, start_time)").eq("student_id", id),
    supabase.from("measurements").select("measured_at, weight_kg, waist_cm, abdomen_cm, bmi, height_cm, notes, source").eq("student_id", id).order("measured_at"),
    supabase.from("charges").select("competence, amount_cents, due_date, status, paid_on, payment_method").eq("student_id", id).order("competence"),
    supabase.from("consents").select("accepted_at, ip, legal_documents(kind, version, body)").eq("student_id", id),
  ])

  // Identificadores internos não interessam ao aluno.
  const internal = new Set(["id", "personal_id", "activated_by", "created_by"])
  const personal = Object.fromEntries(Object.entries(student).filter(([k]) => !internal.has(k)))
  const payload = {
    gerado_em: new Date().toISOString(),
    estudio: "Ritmus Performance",
    aluno: personal,
    saude: health.data,
    mensalidade: billing.data,
    horarios_fixos: enrollments.data,
    presencas: attendances.data,
    medicoes: measurements.data,
    cobrancas: charges.data,
    aceites: consents.data,
  }
  const slug = student.full_name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ritmus-dados-${slug}-${todaySP()}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
