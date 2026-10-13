"use server"

import { headers } from "next/headers"

import { todaySP } from "@/lib/dates"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashToken } from "@/lib/tokens"

import { sanitizeDraft, toSubmission, validateAll, type Errors, type SignupDraft } from "./schema"

const MAX_DRAFT_BYTES = 16_000

/** Salva o rascunho (chamado automaticamente enquanto o aluno preenche). */
export async function saveDraft(token: string, draft: SignupDraft, step: number): Promise<{ ok: boolean }> {
  const clean = sanitizeDraft(draft, {})
  if (JSON.stringify(clean).length > MAX_DRAFT_BYTES) return { ok: false }
  const { data, error } = await createAdminClient()
    .from("student_invites")
    .update({ draft: clean, draft_step: Math.max(0, Math.min(6, Math.trunc(step))) })
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id")
  return { ok: !error && (data?.length ?? 0) > 0 }
}

export type SubmitResult = { ok: true } | { ok: false; message: string; errors?: Errors }

export async function submitSignup(token: string, draft: SignupDraft, docIds: string[]): Promise<SubmitResult> {
  const clean = sanitizeDraft(draft, {})
  const errors = validateAll(clean, todaySP())
  if (Object.keys(errors).length) {
    return { ok: false, message: "Faltam alguns dados. Confira os campos marcados.", errors }
  }

  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null
  const { error } = await createAdminClient().rpc("submit_signup", {
    p_token_hash: hashToken(token),
    p_data: toSubmission(clean),
    p_doc_ids: docIds,
    p_ip: ip && /^[0-9a-f.:]+$/i.test(ip) ? ip : null,
    p_user_agent: h.get("user-agent") ?? "",
  })

  if (!error) return { ok: true }
  if (error.message.includes("convite_usado")) return { ok: false, message: "Este cadastro já foi enviado. Obrigado!" }
  if (error.message.includes("convite_expirado") || error.message.includes("convite_invalido")) {
    return { ok: false, message: "Este link não vale mais. Peça um novo link ao Gabriel." }
  }
  if (error.code === "23505" && error.message.includes("cpf")) {
    return {
      ok: false,
      message: "Este CPF já está cadastrado no Ritmus. Fale com o Gabriel para resolver.",
      errors: { cpf: "CPF já cadastrado." },
    }
  }
  console.error("submit_signup", error)
  return { ok: false, message: "Não conseguimos enviar agora. Confira sua internet e tente de novo — seus dados estão salvos." }
}
