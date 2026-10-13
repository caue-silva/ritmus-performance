import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="dark flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground">
      <Logo size={80} />
      <h1 className="font-display text-4xl font-bold uppercase">Página não encontrada</h1>
      <p className="max-w-sm text-muted-foreground">O endereço pode estar errado ou a página mudou de lugar.</p>
      <Button asChild size="lg">
        <Link href="/">Voltar para o início</Link>
      </Button>
    </main>
  )
}
