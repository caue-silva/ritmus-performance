import type { Metadata } from "next"

import { PageHeader } from "@/components/shell/page-header"
import { InviteMessageForm, LegalDocumentForm, ReferenceFeesForm } from "@/features/configuracoes/components/settings-forms"
import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Configurações" }

const DOCS = [
  { kind: "declaracao_saude", label: "Declaração de saúde" },
  { kind: "termos", label: "Termos de uso" },
  { kind: "lgpd", label: "Consentimento LGPD" },
] as const

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <div>
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
    supabase.from("studio_settings").select("msg_invite, reference_fees").single(),
  ])

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <PageHeader title="Configurações" className="mb-1" />
      <Section title="Cadastro de alunos" description="O que o aluno recebe e aceita ao se cadastrar.">
        <InviteMessageForm message={settings?.msg_invite ?? ""} />
      </Section>
      <Section title="Valores de referência">
        <ReferenceFeesForm fees={(settings?.reference_fees as Record<string, number>) ?? {}} />
      </Section>
      <Section
        title="Textos legais"
        description="Textos provisórios: serão validados juridicamente antes de ir ao ar. Cada alteração vira uma nova versão."
      >
        {DOCS.map((d) => {
          const doc = docs?.find((x) => x.kind === d.kind)
          return doc ? (
            <LegalDocumentForm key={d.kind} kind={d.kind} label={d.label} version={doc.version!} updatedAt={doc.created_at!} body={doc.body!} />
          ) : null
        })}
      </Section>
      <p className="text-center text-sm text-muted-foreground">Pix, mensagens de cobrança e horários de funcionamento chegam nas próximas etapas.</p>
    </div>
  )
}
