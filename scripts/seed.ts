/**
 * Dados fictícios para desenvolvimento. Rode depois de `supabase db reset`:
 *   npm run db:seed
 * Só funciona contra o Supabase LOCAL (recusa qualquer outra URL).
 */
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

import type { Database } from "../src/lib/supabase/database.types"

config({ path: ".env.local" })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const secret = process.env.SUPABASE_SECRET_KEY ?? ""
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321/.test(url)) {
  console.error(`Seed recusado: ${url || "(sem URL)"} não é o Supabase local.`)
  process.exit(1)
}

/** Senha de todas as contas fictícias (somente ambiente local). */
export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "ritmus-local-123"

export const SEED_STAFF = [
  { key: "gabriel", email: "gabriel@ritmus.test", full_name: "Gabriel Paiva", whatsapp: "15991110001", role: "admin" },
  { key: "ana", email: "ana@ritmus.test", full_name: "Ana Souza", whatsapp: "15991110002", role: "personal" },
  { key: "bruno", email: "bruno@ritmus.test", full_name: "Bruno Lima", whatsapp: "15991110003", role: "personal" },
] as const

const db = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

async function ensureUser(s: (typeof SEED_STAFF)[number]): Promise<string> {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 200 })
  const existing = list?.users.find((u) => u.email === s.email)
  const id =
    existing?.id ??
    (await db.auth.admin.createUser({ email: s.email, password: SEED_PASSWORD, email_confirm: true }).then((r) => {
      if (r.error) throw r.error
      return r.data.user.id
    }))
  if (!id) throw new Error(`Não foi possível criar ${s.email}`)
  const { error } = await db.from("profiles").upsert({
    id,
    email: s.email,
    full_name: s.full_name,
    whatsapp: s.whatsapp,
    role: s.role,
    active: true,
    must_change_password: false,
  })
  if (error) throw error
  return id
}

const FIRST = ["Mariana", "Lucas", "Fernanda", "Rafael", "Juliana", "Thiago", "Camila", "Diego", "Patrícia", "Gustavo",
  "Larissa", "Felipe", "Bianca", "Rodrigo", "Aline", "Marcelo", "Vanessa", "Eduardo", "Tatiane", "Leandro"]
const LAST = ["Oliveira", "Santos", "Pereira", "Almeida", "Ferreira", "Rodrigues", "Costa", "Carvalho", "Gomes", "Martins"]

async function main() {
  const ids: Record<string, string> = {}
  for (const s of SEED_STAFF) ids[s.key] = await ensureUser(s)
  console.log("✔ Equipe:", SEED_STAFF.map((s) => s.email).join(", "))

  const { count } = await db.from("students").select("id", { count: "exact", head: true })
  if ((count ?? 0) > 0) {
    console.log("• Alunos já existem — pulei a criação.")
    return
  }

  const personals: string[] = [ids.gabriel!, ids.ana!, ids.bruno!]
  const students = FIRST.map((first, i) => ({
    full_name: `${first} ${LAST[i % LAST.length]}`,
    whatsapp: `1599${String(2000000 + i * 7919).padStart(7, "0")}`,
    personal_id: i < 18 ? personals[i % 3]! : null,
    status: (i < 16 ? "ativo" : i < 18 ? "pausado" : "aguardando") as Database["public"]["Enums"]["student_status"],
    height_cm: 155 + ((i * 7) % 35),
    weekly_frequency: [2, 3, 5][i % 3]!,
    city: "Pilar do Sul",
    state: "SP",
  }))
  const { error } = await db.from("students").insert(students)
  if (error) throw error
  console.log(`✔ ${students.length} alunos fictícios`)
  console.log(`\nContas: ${SEED_STAFF.map((s) => s.email).join(" · ")} — senha em scripts/seed.ts (SEED_PASSWORD)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
