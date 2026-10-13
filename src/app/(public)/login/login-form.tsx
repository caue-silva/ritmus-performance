"use client"

import { Loader2 } from "lucide-react"
import { useActionState, useState } from "react"

import { FormAlert, FormField } from "@/components/feedback/form-field"
import { PasswordInput } from "@/components/feedback/password-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signIn } from "@/features/auth/actions"

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined)
  const fe = state?.fieldErrors ?? {}
  // Controlado para não apagar o e-mail quando a senha estiver errada.
  const [email, setEmail] = useState("")

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormAlert>{state?.error ?? notice}</FormAlert>
      <input type="hidden" name="voltar" value={next ?? ""} />
      <FormField id="email" label="E-mail" error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={Boolean(fe.email)}
          aria-describedby={fe.email ? "email-error" : undefined}
        />
      </FormField>
      <FormField id="password" label="Senha" error={fe.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(fe.password)}
          aria-describedby={fe.password ? "password-error" : undefined}
        />
      </FormField>
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">Esqueceu a senha? Peça ao Gabriel para redefinir.</p>
    </form>
  )
}
