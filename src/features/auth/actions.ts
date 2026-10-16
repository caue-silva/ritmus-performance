"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { fieldErrors } from "@/lib/form-errors"

import { getStaff, homePath } from "@/lib/auth"
import { midiaAuthEvent } from "@/lib/midia-agent"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined

/** Aceita só caminhos internos (evita redirecionar para outro site). */
function safeNext(value: FormDataEntryValue | null): string | null {
  const v = typeof value === "string" ? value : ""
  return v.startsWith("/") && !v.startsWith("//") ? v : null
}

const loginSchema = z.object({
  email: z.email("Digite um e-mail válido."),
  password: z.string().min(1, "Digite sua senha."),
})

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") })
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  // Registro de logins (Midia Performance, Marco Civil): quem tentou, de onde e se deu certo. Nunca a senha.
  const h = await headers()
  const email = parsed.data.email
  const failed = (reason: string) => midiaAuthEvent(h, { outcome: "failure", email, method: "senha", reason })
  if (error?.code === "email_provider_disabled") {
    failed("login desligado no Supabase")
    // Configuração do Supabase (provedor Email desligado): não é problema da pessoa.
    return { error: "O login está fora do ar por uma configuração do sistema. Avise o Gabriel." }
  }
  if (error?.code === "user_banned") {
    failed("conta bloqueada")
    return { error: "Sua conta está desativada. Fale com o Gabriel para liberar o acesso." }
  }
  if (error) {
    const wrong = error.code === "invalid_credentials" || error.status === 400
    failed(wrong ? "senha incorreta" : "erro no login")
    return {
      error: wrong
        ? "E-mail ou senha incorretos. Confira e tente de novo."
        : "Não foi possível entrar agora. Verifique sua internet e tente de novo.",
    }
  }

  const staff = await getStaff()
  if (!staff || !staff.active) {
    failed(staff ? "conta desativada" : "sem perfil no app")
    await supabase.auth.signOut()
    return {
      error: staff
        ? "Sua conta está desativada. Fale com o Gabriel para liberar o acesso."
        : "Sua conta ainda não está liberada no app. Fale com o Gabriel.",
    }
  }
  midiaAuthEvent(h, { outcome: "success", email, userId: staff.id, method: "senha" })
  if (staff.must_change_password) redirect("/primeiro-acesso")
  redirect(safeNext(formData.get("voltar")) ?? homePath(staff.role))
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use pelo menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não são iguais." })

/** Troca de senha: obrigatória no primeiro acesso e disponível em Conta. */
export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") })
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) }
  }

  const staff = await getStaff()
  if (!staff) redirect("/login")

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da atual."
          : error.code === "weak_password"
            ? "Essa senha é fraca. Misture letras e números."
            : "Não foi possível trocar a senha agora. Tente de novo.",
    }
  }

  if (staff.must_change_password) {
    // O personal não pode mexer nesse campo; quem limpa é o servidor.
    await createAdminClient().from("profiles").update({ must_change_password: false }).eq("id", staff.id)
    redirect(`${homePath(staff.role)}?senha=ok`)
  }
  return { error: undefined }
}

export async function signOut() {
  const staff = await getStaff()
  const supabase = await createClient()
  await supabase.auth.signOut()
  if (staff) midiaAuthEvent(await headers(), { outcome: "logout", email: staff.email, userId: staff.id })
  redirect("/login")
}
