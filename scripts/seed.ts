/**
 * Dados fictícios para desenvolvimento. Rode depois de `supabase db reset`:
 *   npm run db:seed        (ou npm run db:reset, que já chama este script)
 * Só funciona contra o Supabase LOCAL (recusa qualquer outra URL).
 */
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

import type { Database, TablesInsert } from "../src/lib/supabase/database.types"
import { generateToken, hashToken } from "../src/lib/tokens"

config({ path: ".env.local", quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const secret = process.env.SUPABASE_SECRET_KEY ?? ""
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321/.test(url)) {
  console.error(`Seed recusado: ${url || "(sem URL)"} não é o Supabase local.`)
  process.exit(1)
}

/** Senha de todas as contas fictícias (somente ambiente local). */
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "ritmus-local-123"

const SEED_STAFF = [
  { key: "gabriel", email: "gabriel@ritmus.test", full_name: "Gabriel Paiva", whatsapp: "15991110001", role: "admin" },
  { key: "ana", email: "ana@ritmus.test", full_name: "Ana Souza", whatsapp: "15991110002", role: "personal" },
  { key: "bruno", email: "bruno@ritmus.test", full_name: "Bruno Lima", whatsapp: "15991110003", role: "personal" },
] as const
type StaffKey = (typeof SEED_STAFF)[number]["key"]

const db = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

function must<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error
  return res.data as NonNullable<T>
}

async function ensureUser(s: (typeof SEED_STAFF)[number]): Promise<string> {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 200 })
  const existing = list?.users.find((u) => u.email === s.email)
  let id = existing?.id
  if (!id) {
    const created = await db.auth.admin.createUser({ email: s.email, password: SEED_PASSWORD, email_confirm: true })
    if (created.error) throw created.error
    id = created.data.user.id
  }
  must(
    await db.from("profiles").upsert({
      id,
      email: s.email,
      full_name: s.full_name,
      whatsapp: s.whatsapp,
      role: s.role,
      active: true,
      must_change_password: false,
    }),
  )
  return id
}

// CPF válido a partir de um número.
function cpf(seed: number) {
  const d = String(100000000 + seed * 7654321).slice(-9).split("").map(Number)
  const dv = (arr: number[]) => {
    const r = (arr.reduce((s, n, i) => s + n * (arr.length + 1 - i), 0) * 10) % 11
    return r === 10 ? 0 : r
  }
  d.push(dv(d))
  d.push(dv(d))
  return d.join("")
}

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

// Horários fixos: quem dá aula em cada hora (seg a sex) + sábado.
const WEEKDAY_TIMES: Record<string, StaffKey> = {
  "06:00": "gabriel",
  "07:00": "gabriel",
  "08:00": "ana",
  "09:00": "ana",
  "12:00": "ana",
  "17:00": "gabriel",
  "18:00": "gabriel",
  "19:00": "bruno",
  "20:00": "bruno",
}
const SATURDAY_TIMES: Record<string, StaffKey> = { "08:00": "gabriel", "09:00": "ana", "10:00": "bruno" }

const DAYS_BY_FREQUENCY: Record<number, number[]> = { 2: [2, 4], 3: [1, 3, 5], 5: [1, 2, 3, 4, 5] }
const FEE_BY_FREQUENCY: Record<number, number> = { 2: 28000, 3: 36000, 5: 50000 }

type SeedStudent = {
  name: string
  personal: StaffKey | null
  status: Database["public"]["Enums"]["student_status"]
  freq: number
  fee?: number | null
  parq?: boolean[]
  notes?: string
  clearance?: boolean
}

const NO = [false, false, false, false, false, false, false]

const STUDENTS: SeedStudent[] = [
  { name: "Mariana Oliveira", personal: "gabriel", status: "ativo", freq: 3 },
  { name: "Lucas Santos", personal: "ana", status: "ativo", freq: 2 },
  { name: "Fernanda Pereira", personal: "bruno", status: "ativo", freq: 3 },
  { name: "Rafael Almeida", personal: "gabriel", status: "ativo", freq: 5, notes: "Dor lombar ocasional ao agachar." },
  { name: "Juliana Ferreira", personal: "ana", status: "ativo", freq: 3 },
  { name: "Thiago Rodrigues", personal: "bruno", status: "ativo", freq: 2 },
  { name: "Camila Costa", personal: "gabriel", status: "ativo", freq: 2 },
  {
    name: "Diego Carvalho",
    personal: "ana",
    status: "ativo",
    freq: 3,
    parq: [false, false, false, false, true, false, false],
    notes: "Cirurgia no joelho direito em 2023.",
    clearance: true,
  },
  { name: "Patrícia Gomes", personal: "bruno", status: "ativo", freq: 3 },
  { name: "Gustavo Martins", personal: "gabriel", status: "ativo", freq: 3 },
  { name: "Larissa Oliveira", personal: "ana", status: "ativo", freq: 2 },
  { name: "Felipe Santos", personal: "bruno", status: "ativo", freq: 5 },
  { name: "Bianca Pereira", personal: "gabriel", status: "ativo", freq: 2 },
  { name: "Rodrigo Almeida", personal: "ana", status: "ativo", freq: 3 },
  { name: "Aline Ferreira", personal: "bruno", status: "ativo", freq: 2 },
  // Aluno ativo sem valor definido → tarefa "Definir valor".
  { name: "Marcelo Rodrigues", personal: "gabriel", status: "ativo", freq: 3, fee: null },
  { name: "Eduardo Carvalho", personal: "ana", status: "pausado", freq: 2 },
  { name: "Vanessa Costa", personal: "bruno", status: "pausado", freq: 3 },
  // Cadastro recebido com "sim" no PAR-Q → tarefa "Liberação médica".
  {
    name: "Leandro Martins",
    personal: null,
    status: "aguardando",
    freq: 3,
    parq: [false, true, false, false, false, true, false],
    notes: "Tomo remédio para pressão.",
  },
  // Cadastro recebido sem pendências → tarefa "Ativar".
  { name: "Tatiane Gomes", personal: null, status: "aguardando", freq: 2 },
]

const GOALS = [["Emagrecer"], ["Ganhar massa muscular"], ["Condicionamento", "Saúde"], ["Emagrecer", "Condicionamento"], ["Saúde"]]

async function main() {
  const ids = {} as Record<StaffKey, string>
  for (const s of SEED_STAFF) ids[s.key] = await ensureUser(s)
  console.log("✔ Equipe:", SEED_STAFF.map((s) => s.email).join(", "))

  const { count } = await db.from("students").select("id", { count: "exact", head: true })
  if ((count ?? 0) > 0) {
    console.log("• Já existem alunos — nada mais a fazer. Use npm run db:reset para recomeçar.")
    return
  }

  // Horários fixos
  const slotRows: TablesInsert<"time_slots">[] = []
  for (let weekday = 1; weekday <= 5; weekday++) {
    for (const [time, key] of Object.entries(WEEKDAY_TIMES)) slotRows.push({ weekday, start_time: time, personal_id: ids[key] })
  }
  for (const [time, key] of Object.entries(SATURDAY_TIMES)) slotRows.push({ weekday: 6, start_time: time, personal_id: ids[key] })
  const slots = must(await db.from("time_slots").insert(slotRows).select("id, weekday, start_time, personal_id, capacity"))
  const taken = new Map<string, number>()
  console.log(`✔ ${slots.length} horários fixos`)

  const legalDocs = must(await db.from("current_legal_documents").select("id"))

  let enrollments = 0
  for (const [i, s] of STUDENTS.entries()) {
    const student = must(
      await db
        .from("students")
        .insert({
          full_name: s.name,
          whatsapp: `1599${String(2000000 + i * 7919).padStart(7, "0")}`,
          personal_id: s.personal ? ids[s.personal] : null,
          status: "aguardando", // ativa depois de gravar o PAR-Q
          cpf: cpf(i + 1),
          birth_date: `${1975 + ((i * 3) % 30)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
          email: i % 3 === 0 ? `${s.name.split(" ")[0]!.toLowerCase()}@exemplo.com` : null,
          cep: "18185000",
          street: ["Rua Sete de Setembro", "Rua XV de Novembro", "Av. Antônio Lacerda", "Rua São João"][i % 4],
          number: String(100 + i * 13),
          neighborhood: ["Centro", "Jardim Bela Vista", "Vila Nova"][i % 3],
          city: "Pilar do Sul",
          state: "SP",
          emergency_name: ["Maria Oliveira", "José Santos", "Ana Pereira", "Paulo Costa"][i % 4],
          emergency_phone: `1599${String(3000000 + i * 4111).padStart(7, "0")}`,
          emergency_relation: ["Mãe", "Pai", "Cônjuge", "Irmão(ã)"][i % 4],
          goals: GOALS[i % GOALS.length],
          height_cm: 155 + ((i * 7) % 35),
          weekly_frequency: s.freq,
          submitted_at: isoDaysAgo(s.status === "aguardando" ? 1 + (i % 2) : 60 + i),
        })
        .select("id")
        .single(),
    )

    must(
      await db.from("student_health").insert({
        student_id: student.id,
        parq_answers: s.parq ?? NO,
        health_notes: s.notes ?? null,
        clearance_received_on: s.clearance ? isoDaysAgo(70).slice(0, 10) : null,
        clearance_registered_by: s.clearance ? ids.gabriel : null,
        clearance_registered_at: s.clearance ? isoDaysAgo(70) : null,
      }),
    )
    must(
      await db
        .from("consents")
        .insert(legalDocs.map((d) => ({ student_id: student.id, legal_document_id: d.id!, accepted_at: isoDaysAgo(60 + i) }))),
    )
    must(
      await db.from("student_billing").insert({
        student_id: student.id,
        monthly_fee_cents: s.status === "aguardando" || s.fee === null ? null : (s.fee ?? FEE_BY_FREQUENCY[s.freq]),
        due_day: [5, 10, 15, 20][i % 4],
        updated_by: ids.gabriel,
      }),
    )
    // Medição inicial (veio do formulário de cadastro)
    must(
      await db.from("measurements").insert({
        client_id: crypto.randomUUID(),
        student_id: student.id,
        measured_at: isoDaysAgo(s.status === "aguardando" ? 1 : 60 + i),
        weight_kg: 58 + ((i * 11) % 40),
        source: "cadastro",
        created_by: null,
      }),
    )

    if (s.status === "ativo" || s.status === "pausado") {
      must(
        await db
          .from("students")
          .update({ status: s.status, activated_at: isoDaysAgo(59 + i), activated_by: ids.gabriel })
          .eq("id", student.id),
      )
    }

    // Matrículas fixas: dias da frequência, num horário do próprio personal com vaga.
    if (s.status === "ativo" && s.personal) {
      const mine = slots.filter((t) => t.personal_id === ids[s.personal!] && t.weekday <= 5)
      const times = [...new Set(mine.map((t) => t.start_time))]
      for (let k = 0; k < times.length; k++) {
        const time = times[(i + k) % times.length]
        const chosen = DAYS_BY_FREQUENCY[s.freq]!.map((wd) => mine.find((t) => t.weekday === wd && t.start_time === time)!)
        if (chosen.every((t) => (taken.get(t.id) ?? 0) < t.capacity)) {
          must(
            await db.from("enrollments").insert(
              chosen.map((t) => ({
                student_id: student.id,
                time_slot_id: t.id,
                starts_on: isoDaysAgo(59 + i).slice(0, 10),
                created_by: ids.gabriel,
              })),
            ),
          )
          chosen.forEach((t) => taken.set(t.id, (taken.get(t.id) ?? 0) + 1))
          enrollments += chosen.length
          break
        }
      }
    }
  }
  console.log(`✔ ${STUDENTS.length} alunos com PAR-Q, valores e ${enrollments} horários fixos`)

  // Pré-cadastro com link enviado (formulário ainda não preenchido)
  const invited = must(
    await db
      .from("students")
      .insert({ full_name: "Carolina Dias", whatsapp: "15996661234", status: "convidado", created_by: ids.gabriel })
      .select("id")
      .single(),
  )
  const token = process.env.SEED_INVITE_TOKEN ?? generateToken()
  must(await db.from("student_invites").insert({ student_id: invited.id, token_hash: hashToken(token), created_by: ids.gabriel }))
  console.log(`✔ Pré-cadastro "Carolina Dias" — link do formulário:\n  ${siteUrl}/cadastro/${token}`)

  console.log(`\nContas: ${SEED_STAFF.map((s) => s.email).join(" · ")} — senha em scripts/seed.ts (SEED_PASSWORD)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
