import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Logo } from "@/components/brand/logo"
import { getStaff, homePath } from "@/lib/auth"

import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Entrar" }

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { voltar, motivo } = await searchParams
  const staff = await getStaff()
  if (staff?.active && motivo !== "desativado") redirect(staff.must_change_password ? "/primeiro-acesso" : homePath(staff.role))

  return (
    <div className="grid gap-8">
      <div className="grid justify-items-center gap-4 text-center">
        <Logo size={112} priority />
        <div>
          <h1 className="font-display text-4xl font-bold uppercase">Bora treinar</h1>
          <p className="mt-1 text-muted-foreground">Entre com seu e-mail e senha.</p>
        </div>
      </div>
      <LoginForm
        next={typeof voltar === "string" ? voltar : undefined}
        notice={motivo === "desativado" ? "Sua conta está desativada. Fale com o Gabriel para liberar o acesso." : undefined}
      />
    </div>
  )
}
