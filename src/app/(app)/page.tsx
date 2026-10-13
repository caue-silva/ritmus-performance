import { redirect } from "next/navigation"

import { homePath, requireStaff } from "@/lib/auth"

/** "/" abre a tela inicial do perfil: Tarefas (admin) ou Agora (personal). */
export default async function Home() {
  const staff = await requireStaff()
  redirect(homePath(staff.role))
}
