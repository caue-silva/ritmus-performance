import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Logo } from "@/components/brand/logo"
import { getStaff, homePath } from "@/lib/auth"

import { PasswordForm } from "./password-form"

export const metadata: Metadata = { title: "Primeiro acesso" }

export default async function FirstAccessPage() {
  const staff = await getStaff()
  if (!staff) redirect("/login")
  if (!staff.active) redirect("/login?motivo=desativado")
  if (!staff.must_change_password) redirect(homePath(staff.role))

  const firstName = staff.full_name.split(" ")[0]
  return (
    <div className="grid gap-8">
      <div className="grid justify-items-center gap-4 text-center">
        <Logo size={80} priority />
        <div>
          <h1 className="font-display text-4xl font-bold uppercase">Oi, {firstName}!</h1>
          <p className="mt-1 text-muted-foreground">
            Antes de começar, crie a sua senha. A senha temporária deixa de valer depois disso.
          </p>
        </div>
      </div>
      <PasswordForm />
    </div>
  )
}
