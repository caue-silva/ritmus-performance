"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth"
import type { Enums } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

type Result = { ok: true } | { ok: false; message: string }

/** Editar um texto legal = criar uma nova versão. Os aceites antigos continuam apontando para a versão aceita. */
export async function saveLegalDocument(kind: Enums<"legal_doc_kind">, body: string): Promise<Result> {
  const admin = await requireAdmin()
  const text = body.trim()
  if (text.length < 20) return { ok: false, message: "O texto ficou muito curto." }
  const supabase = await createClient()
  const { data: current } = await supabase
    .from("legal_documents")
    .select("version, body")
    .eq("kind", kind)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (current?.body.trim() === text) return { ok: false, message: "Nada mudou no texto." }
  const { error } = await supabase
    .from("legal_documents")
    .insert({ kind, version: (current?.version ?? 0) + 1, body: text, created_by: admin.id })
  if (error) return { ok: false, message: "Não foi possível salvar. Tente de novo." }
  revalidatePath("/configuracoes")
  return { ok: true }
}

export async function saveInviteMessage(message: string): Promise<Result> {
  const admin = await requireAdmin()
  const text = message.trim()
  if (!text.includes("{link}")) return { ok: false, message: "A mensagem precisa ter {link}, senão o aluno não recebe o link." }
  const supabase = await createClient()
  const { error } = await supabase.from("studio_settings").update({ msg_invite: text, updated_by: admin.id }).eq("id", true)
  if (error) return { ok: false, message: "Não foi possível salvar. Tente de novo." }
  revalidatePath("/configuracoes")
  return { ok: true }
}

export async function saveReferenceFees(fees: Record<string, number | null>): Promise<Result> {
  const admin = await requireAdmin()
  const clean: Record<string, number> = {}
  for (const [k, v] of Object.entries(fees)) {
    if (!/^[1-6]$/.test(k)) continue
    if (v !== null && (!Number.isInteger(v) || v <= 0)) return { ok: false, message: "Os valores precisam ser maiores que zero." }
    if (v) clean[k] = v
  }
  const supabase = await createClient()
  const { error } = await supabase.from("studio_settings").update({ reference_fees: clean, updated_by: admin.id }).eq("id", true)
  if (error) return { ok: false, message: "Não foi possível salvar. Tente de novo." }
  revalidatePath("/configuracoes")
  return { ok: true }
}
