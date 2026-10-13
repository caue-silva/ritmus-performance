import { ArrowLeft, HeartPulse, MessageCircle, Pencil, Phone, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { StudentStatusBadge } from "@/components/feedback/status-badge"
import { Button } from "@/components/ui/button"
import { FeeEditor, StatusActions, StudentPrimaryAction } from "@/features/alunos/components/student-actions"
import { getActivationOptions, getStudentDetail } from "@/features/alunos/queries"
import { PARQ_QUESTIONS } from "@/features/cadastro/parq"
import { requireStaff } from "@/lib/auth"
import { todaySP } from "@/lib/dates"
import { formatCPF, formatDate, formatPhone, summarizeSchedule } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ageOn } from "@/lib/validation"
import { whatsappLink } from "@/lib/whatsapp"

export const metadata: Metadata = { title: "Aluno" }

function Section({
  id,
  title,
  action,
  children,
  className,
}: {
  id?: string
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn("grid content-start gap-3 rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{children || "—"}</dd>
    </div>
  )
}

export default async function AlunoPage({ params }: PageProps<"/alunos/[id]">) {
  const staff = await requireStaff()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const isAdmin = staff.role === "admin"
  const [detail, options] = await Promise.all([getStudentDetail(id, isAdmin), isAdmin ? getActivationOptions() : null])
  // Aluno de outro personal: o RLS não devolve nada → "não encontrado".
  if (!detail) notFound()
  const { student: s, health, billing, enrollments, initialWeight } = detail

  const yesAnswers = health?.parq_answers.map((a, i) => (a ? i : -1)).filter((i) => i >= 0) ?? []
  const needsClearance = !!health?.requires_clearance && !health.clearance_received_on
  const hasHealthNote = yesAnswers.length > 0 || !!health?.health_notes
  const age = s.birth_date ? ageOn(s.birth_date, todaySP()) : null
  const target = {
    id: s.id,
    full_name: s.full_name,
    personal_id: s.personal_id,
    weekly_frequency: s.weekly_frequency,
    fee_cents: billing?.monthly_fee_cents ?? null,
    due_day: billing?.due_day ?? null,
  }

  return (
    <div className="grid gap-5">
      <div>
        <Button asChild variant="ghost" className="-ml-3 mb-2">
          <Link href="/alunos">
            <ArrowLeft /> Alunos
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <h1 className="font-display text-3xl leading-tight font-bold uppercase md:text-4xl">{s.full_name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
              <StudentStatusBadge status={s.status} />
              {s.personal?.full_name && <span>com {s.personal.full_name.split(" ")[0]}</span>}
              {s.status === "ativo" && <span>{summarizeSchedule(enrollments)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Aviso discreto de saúde, para ver antes da aula */}
      {hasHealthNote && (
        <a
          href="#saude"
          className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-warning"
        >
          <HeartPulse className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span className="text-sm font-medium">
            {yesAnswers.length > 0 && `“Sim” em ${yesAnswers.length} ${yesAnswers.length === 1 ? "pergunta" : "perguntas"} do PAR-Q`}
            {yesAnswers.length > 0 && health?.health_notes && " · "}
            {health?.health_notes && <>“{health.health_notes}”</>}
            {needsClearance && " · aguardando liberação médica"}
          </span>
        </a>
      )}

      <div className="flex flex-wrap gap-2">
        {isAdmin && options && (
          <StudentPrimaryAction target={target} status={s.status} needsClearance={needsClearance} options={options} />
        )}
        <Button asChild size="lg" variant="outline">
          <a href={whatsappLink(s.whatsapp)} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden /> WhatsApp
          </a>
        </Button>
        {s.status !== "convidado" && (
          <Button asChild size="lg" variant="outline">
            <Link href={`/alunos/${s.id}/editar`}>
              <Pencil aria-hidden /> Editar dados
            </Link>
          </Button>
        )}
      </div>

      {s.status === "convidado" ? (
        <Section title="Cadastro">
          <p className="text-muted-foreground">
            {detail.invite && new Date(detail.invite.expires_at) > new Date()
              ? `O link de cadastro foi enviado e vale até ${formatDate(detail.invite.expires_at)}. Assim que ${s.full_name.split(" ")[0]} preencher, aparece uma tarefa para você.`
              : "O link de cadastro expirou. Gere um novo link e mande pelo WhatsApp."}
          </p>
        </Section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Contato">
            <dl className="grid gap-2">
              <Info label="WhatsApp">{formatPhone(s.whatsapp)}</Info>
              <Info label="E-mail">{s.email}</Info>
              <Info label="Nascimento">{s.birth_date && `${formatDate(s.birth_date)}${age !== null ? ` (${age} anos)` : ""}`}</Info>
              <Info label="CPF">{formatCPF(s.cpf)}</Info>
            </dl>
          </Section>

          <Section title="Emergência">
            <dl className="grid gap-2">
              <Info label="Nome">{s.emergency_name}</Info>
              <Info label="Quem é">{s.emergency_relation}</Info>
              <Info label="Telefone">{formatPhone(s.emergency_phone)}</Info>
            </dl>
            {s.emergency_phone && (
              <Button asChild variant="outline">
                <a href={`tel:+55${s.emergency_phone}`}>
                  <Phone aria-hidden /> Ligar para {s.emergency_name?.split(" ")[0] ?? "contato"}
                </a>
              </Button>
            )}
          </Section>

          <Section title="Objetivos e medidas">
            {s.goals.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {s.goals.map((g) => (
                  <li key={g} className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
                    {g}
                  </li>
                ))}
              </ul>
            )}
            {s.goals_notes && <p className="text-muted-foreground">“{s.goals_notes}”</p>}
            <dl className="grid gap-2">
              <Info label="Altura">{s.height_cm && `${String(s.height_cm / 100).replace(".", ",")} m`}</Info>
              <Info label="Peso inicial">{initialWeight && `${String(initialWeight).replace(".", ",")} kg`}</Info>
              <Info label="Frequência">{s.weekly_frequency && `${s.weekly_frequency}x por semana`}</Info>
            </dl>
          </Section>

          <Section title="Endereço">
            <p className="font-medium">
              {[s.street, s.number].filter(Boolean).join(", ")}
              {s.complement && ` — ${s.complement}`}
              <br />
              {[s.neighborhood, s.city && `${s.city}/${s.state}`].filter(Boolean).join(" · ")}
              {s.cep && <span className="block text-muted-foreground">CEP {s.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}</span>}
            </p>
          </Section>

          <Section id="saude" title="Saúde" className="scroll-mt-20 lg:col-span-2">
            {health ? (
              <>
                <ol className="grid gap-2">
                  {PARQ_QUESTIONS.map((q, i) => {
                    const yes = health.parq_answers[i]
                    return (
                      <li key={i} className={cn("flex gap-3 rounded-lg px-3 py-2", yes ? "bg-warning-soft" : "")}>
                        <span className={cn("w-9 shrink-0 font-bold", yes ? "text-warning" : "text-muted-foreground")}>
                          {yes ? "Sim" : "Não"}
                        </span>
                        <span className={cn("text-sm", !yes && "text-muted-foreground")}>{q}</span>
                      </li>
                    )
                  })}
                </ol>
                {health.health_notes && (
                  <p className="rounded-lg bg-muted px-3 py-2">
                    <span className="font-semibold">Observação do aluno:</span> {health.health_notes}
                  </p>
                )}
                {health.requires_clearance && (
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {health.clearance_received_on ? (
                      <>
                        <ShieldCheck className="size-4 text-success" aria-hidden /> Liberação médica recebida em{" "}
                        {formatDate(health.clearance_received_on)}
                      </>
                    ) : (
                      <>
                        <HeartPulse className="size-4 text-warning" aria-hidden /> Aguardando liberação médica
                      </>
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">O aluno ainda não respondeu o PAR-Q.</p>
            )}
          </Section>

          {isAdmin && options && (
            <Section title="Mensalidade">
              <FeeEditor target={target} referenceFees={options.referenceFees} />
            </Section>
          )}

          {isAdmin && (s.status === "ativo" || s.status === "pausado") && (
            <Section title="Status">
              <StatusActions studentId={s.id} name={s.full_name} status={s.status} />
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
