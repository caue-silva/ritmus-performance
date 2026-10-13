"use server"

import { revalidatePath } from "next/cache"

import { requireStaff } from "@/lib/auth"
import { supabaseUrl } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

/** Salva (ou remove) a foto. Personal só a própria; admin de qualquer um da equipe. */
export async function setStaffAvatar(staffId: string, url: string | null): Promise<{ ok: boolean; message?: string }> {
  const me = await requireStaff()
  if (me.role !== "admin" && me.id !== staffId) return { ok: false, message: "Você só pode trocar a sua foto." }
  const prefix = `${supabaseUrl()}/storage/v1/object/public/avatars/${staffId}/`
  if (url !== null && !url.startsWith(prefix)) return { ok: false, message: "Endereço da foto inválido." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", staffId).select("id")
  if (error || !data?.length) return { ok: false, message: "Não deu para salvar a foto agora." }
  revalidatePath("/", "layout")
  return { ok: true }
}
