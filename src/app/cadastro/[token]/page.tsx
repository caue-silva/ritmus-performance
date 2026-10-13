import { Link2Off, MessageCircle, PartyPopper } from "lucide-react"
import type { Metadata } from "next"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { SignupWizard } from "@/features/cadastro/components/signup-wizard"
import { loadInvite } from "@/features/cadastro/invite"
import { whatsappLink } from "@/lib/whatsapp"

export const metadata: Metadata = { title: "Cadastro", robots: { index: false, follow: false } }

function Message({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <main className="dark flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground">
      <Logo size={80} />
      <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand-ink">{icon}</span>
      <h1 className="font-display text-3xl font-bold uppercase">{title}</h1>
      <div className="grid max-w-sm justify-items-center gap-4 text-muted-foreground">{children}</div>
    </main>
  )
}

export default async function CadastroPage({ params }: PageProps<"/cadastro/[token]">) {
  const { token } = await params
  const invite = await loadInvite(token)

  if (invite.status === "invalido") {
    return (
      <Message icon={<Link2Off className="size-7" />} title="Link inválido">
        <p>Confira se o link foi copiado inteiro. Se não der certo, peça um novo link ao Gabriel.</p>
      </Message>
    )
  }
  if (invite.status === "expirado") {
    return (
      <Message icon={<Link2Off className="size-7" />} title="Este link expirou">
        <p>Os links de cadastro valem por 7 dias. Peça um novo ao Gabriel que ele te manda rapidinho.</p>
        {invite.studioWhatsapp && (
          <Button asChild size="lg">
            <a href={whatsappLink(invite.studioWhatsapp, "Oi, Gabriel! Meu link de cadastro do Ritmus expirou. Pode me mandar outro?")}>
              <MessageCircle /> Pedir novo link
            </a>
          </Button>
        )}
      </Message>
    )
  }
  if (invite.status === "enviado") {
    return (
      <Message icon={<PartyPopper className="size-7" />} title="Cadastro já enviado">
        <p>Seu cadastro chegou para o Gabriel. Ele vai confirmar seus horários pelo WhatsApp.</p>
      </Message>
    )
  }

  return (
    <SignupWizard
      token={token}
      firstName={invite.firstName}
      initialDraft={invite.draft}
      initialStep={invite.step}
      docs={invite.docs}
    />
  )
}
