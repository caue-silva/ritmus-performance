"use client"

import { Loader2 } from "lucide-react"
import { useActionState, useEffect, useRef } from "react"
import { toast } from "sonner"

import { FormAlert, FormField } from "@/components/feedback/form-field"
import { PasswordInput } from "@/components/feedback/password-input"
import { Button } from "@/components/ui/button"
import { changePassword } from "@/features/auth/actions"

export function PasswordForm({ submitLabel = "Salvar e entrar", successToast }: { submitLabel?: string; successToast?: string }) {
  const [state, action, pending] = useActionState(changePassword, undefined)
  const fe = state?.fieldErrors ?? {}
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    // Sem erro depois de enviar = senha trocada (quando a action não redireciona).
    if (state && !state.error && !state.fieldErrors && successToast) {
      toast.success(successToast)
      formRef.current?.reset()
    }
  }, [state, successToast])

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <FormAlert>{state?.error}</FormAlert>
      <FormField id="password" label="Nova senha" error={fe.password} hint="Pelo menos 8 caracteres.">
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(fe.password)}
          aria-describedby={fe.password ? "password-error" : "password-hint"}
        />
      </FormField>
      <FormField id="confirm" label="Repita a nova senha" error={fe.confirm}>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(fe.confirm)}
          aria-describedby={fe.confirm ? "confirm-error" : undefined}
        />
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Salvando…" : submitLabel}
      </Button>
    </form>
  )
}
