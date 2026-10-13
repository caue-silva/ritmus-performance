import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import type { Tables } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

export type Staff = Tables<"profiles">

export const homePath = (role: Staff["role"]) => (role === "admin" ? "/tarefas" : "/agora")

/** Perfil de quem está logado (ou null). Memorizado por requisição. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return null
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
  return profile
})

/** Exige equipe ativa com senha já trocada. Use no topo de páginas e actions. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff()
  if (!staff) redirect("/login")
  if (!staff.active) redirect("/login?motivo=desativado")
  if (staff.must_change_password) redirect("/primeiro-acesso")
  return staff
}

export async function requireAdmin(): Promise<Staff> {
  const staff = await requireStaff()
  if (staff.role !== "admin") redirect(homePath(staff.role))
  return staff
}
