import { LogOut } from "lucide-react"
import type { Metadata } from "next"

import { PageHeader } from "@/components/shell/page-header"
import { ThemePicker } from "@/components/shell/theme-picker"
import { Button } from "@/components/ui/button"
import { signOut } from "@/features/auth/actions"
import { requireStaff } from "@/lib/auth"
import { formatPhone } from "@/lib/format"

import { InstallAppSection } from "@/components/pwa/install-app"
import { AvatarUploader } from "@/features/equipe/components/avatar-uploader"

import { PasswordForm } from "../../(public)/primeiro-acesso/password-form"

export const metadata: Metadata = { title: "Minha conta" }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
      {children}
    </section>
  )
}

export default async function ContaPage() {
  const staff = await requireStaff()
  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <PageHeader title="Minha conta" className="mb-1" />
      <Section title="Seus dados">
        <AvatarUploader staffId={staff.id} name={staff.full_name} url={staff.avatar_url} />
        <dl className="grid gap-3">
          {[
            ["Nome", staff.full_name],
            ["E-mail", staff.email],
            ["WhatsApp", formatPhone(staff.whatsapp) || "—"],
            ["Perfil", staff.role === "admin" ? "Administrador" : "Personal"],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6rem_1fr] gap-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-semibold break-all">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="App no celular">
        <InstallAppSection />
      </Section>
      <Section title="Aparência">
        <ThemePicker />
      </Section>
      <Section title="Trocar senha">
        <PasswordForm submitLabel="Trocar senha" successToast="Senha trocada." />
      </Section>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <LogOut /> Sair
        </Button>
      </form>
    </div>
  )
}
