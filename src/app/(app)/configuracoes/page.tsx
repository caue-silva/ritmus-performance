import { CalendarClock, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/shell/page-header"
import { InviteMessageForm, LegalDocumentForm, ReferenceFeesForm } from "@/features/configuracoes/components/settings-forms"
import { ChargeMessagesForm, PixSettingsForm } from "@/features/financeiro/components/finance-settings"
import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Configurações" }

const DOCS = [
  { kind: "declaracao_saude", label: "Declaração de saúde" },
  { kind: "termos", label: "Termos de uso" },
  { kind: "lgpd", label: "Consentimento LGPD" },
] as const

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 grid gap-5 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-1">
        <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export default async function ConfiguracoesPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ data: docs }, { data: settings }] = await Promise.all([
    supabase.from("current_legal_documents").select("kind, version, body, created_at"),
    supabase
      .from("studio_settings")
      .select("msg_invite, reference_fees, pix_key, pix_key_type, pix_receiver_name, pix_city, msg_due_today, msg_overdue, msg_reminder")
      .single(),
  ])

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <PageHeader title="Configurações" className="mb-1" />
      <Link
        href="/configuracoes/horarios"
        className="flex min-h-16 items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
      >
        <CalendarClock className="size-6 text-brand-ink" aria-hidden />
        <span className="grid flex-1">
          <span className="font-display text-xl font-bold uppercase">Horários e feriados</span>
          <span className="text-sm text-muted-foreground">Funcionamento, quem dá aula em cada horário e dias fechados.</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>
      <Section id="pix" title="Pix" description="A chave que vai no Pix copia e cola e no QR Code de cada mensalidade.">
        <PixSettingsForm
          initial={{
            pix_key: settings?.pix_key ?? null,
            pix_key_type: settings?.pix_key_type ?? null,
            pix_receiver_name: settings?.pix_receiver_name ?? null,
            pix_city: settings?.pix_city ?? null,
          }}
        />
      </Section>
      <Section title="Mensagens de cobrança" description="O texto que abre pronto no WhatsApp quando você toca em “Cobrar no WhatsApp”.">
        <ChargeMessagesForm
          initial={{
            msg_reminder: settings?.msg_reminder ?? "",
            msg_due_today: settings?.msg_due_today ?? "",
            msg_overdue: settings?.msg_overdue ?? "",
          }}
        />
      </Section>
      <Section title="Cadastro de alunos" description="O que o aluno recebe e aceita ao se cadastrar.">
        <InviteMessageForm message={settings?.msg_invite ?? ""} />
      </Section>
      <Section
        title="Valores de referência"
        description="Só uma sugestão na hora de definir o valor: cada aluno tem o valor combinado com você."
      >
        <ReferenceFeesForm fees={(settings?.reference_fees as Record<string, number>) ?? {}} />
      </Section>
      <Section
        title="Textos legais"
        description="Não são enviados separadamente: aparecem no formulário que o aluno abre pelo link de cadastro. A declaração de saúde fica na etapa “Saúde” e os termos e a LGPD na última etapa. O aluno só envia o cadastro depois de aceitar, e o aceite fica registrado na ficha dele com data, hora e versão do texto. Textos provisórios: serão validados juridicamente antes de ir ao ar."
      >
        {DOCS.map((d) => {
          const doc = docs?.find((x) => x.kind === d.kind)
          return doc ? (
            <LegalDocumentForm key={d.kind} kind={d.kind} label={d.label} version={doc.version!} updatedAt={doc.created_at!} body={doc.body!} />
          ) : null
        })}
      </Section>
    </div>
  )
}
