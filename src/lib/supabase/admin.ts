import "server-only"

import { createClient } from "@supabase/supabase-js"

import type { Database } from "./database.types"
import { supabaseUrl } from "./env"

/**
 * Cliente com a chave secreta (ignora o RLS). Use SOMENTE para:
 *  - criar e redefinir contas da equipe;
 *  - o formulário público de cadastro (validado pelo token);
 *  - o ping diário do /api/cron/keepalive (lê só um id, para o banco não pausar).
 * Sempre verifique a permissão de quem chamou antes de usar.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("Variável de ambiente ausente: SUPABASE_SECRET_KEY. Veja .env.example.")
  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
