import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../src/lib/supabase/database.types"

export type Db = SupabaseClient<Database>

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const secret = process.env.SUPABASE_SECRET_KEY!

if (!/^http:\/\/(127\.0\.0\.1|localhost):54321/.test(url ?? "")) {
  throw new Error("Os testes de RLS só rodam contra o Supabase local (npm run db:start).")
}

export const PASSWORD = process.env.SEED_PASSWORD ?? "ritmus-local-123"

const opts = { auth: { persistSession: false, autoRefreshToken: false } }

/** Cliente do servidor (ignora RLS) — só para montar e limpar os cenários. */
export const service = (): Db => createClient<Database>(url, secret, opts)

export const anon = (): Db => createClient<Database>(url, publishable, opts)

export async function signIn(email: string): Promise<Db> {
  const client = anon()
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`Login de ${email} falhou: ${error.message}. Rode npm run db:reset.`)
  return client
}

export async function profileId(db: Db, email: string): Promise<string> {
  const { data, error } = await db.from("profiles").select("id").eq("email", email).single()
  if (error) throw error
  return data.id
}

/** Falha o teste se o Supabase devolver erro. (Insert sem .select() devolve data = null.) */
export function ok<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error
  return res.data as NonNullable<T>
}
