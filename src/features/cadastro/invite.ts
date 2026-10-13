import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { hashToken } from "@/lib/tokens"
import { maskPhone } from "@/lib/validation"

import { sanitizeDraft, type SignupDraft } from "./schema"

export type LegalDoc = { id: string; kind: "termos" | "lgpd" | "declaracao_saude"; version: number; body: string }

export type InviteState =
  | { status: "invalido" }
  | { status: "expirado"; studioWhatsapp: string | null }
  | { status: "enviado" }
  | {
      status: "ok"
      firstName: string
      draft: SignupDraft
      step: number
      docs: LegalDoc[]
    }

/** Carrega o convite pelo token (servidor, com a chave secreta: o aluno não tem login). */
export async function loadInvite(token: string): Promise<InviteState> {
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(token)) return { status: "invalido" }
  const db = createAdminClient()
  const { data: invite } = await db
    .from("student_invites")
    .select("id, expires_at, used_at, draft, draft_step, students(full_name, whatsapp, status)")
    .eq("token_hash", hashToken(token))
    .maybeSingle()

  if (!invite || !invite.students) return { status: "invalido" }
  if (invite.used_at) return { status: "enviado" }
  if (new Date(invite.expires_at) < new Date()) {
    const { data: admin } = await db.from("profiles").select("whatsapp").eq("role", "admin").eq("active", true).limit(1).maybeSingle()
    return { status: "expirado", studioWhatsapp: admin?.whatsapp ?? null }
  }

  const { data: docs } = await db.from("current_legal_documents").select("id, kind, version, body")
  const student = invite.students
  return {
    status: "ok",
    firstName: student.full_name.split(" ")[0] ?? "",
    draft: sanitizeDraft(invite.draft, { full_name: student.full_name, whatsapp: maskPhone(student.whatsapp) }),
    step: invite.draft_step,
    docs: (docs ?? []) as LegalDoc[],
  }
}
