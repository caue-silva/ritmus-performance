/**
 * Dados fictícios.
 *
 * Desenvolvimento (Supabase LOCAL), depois de `supabase db reset`:
 *   npm run db:seed        (ou npm run db:reset, que já chama este script)
 *
 * Demonstração num projeto remoto AINDA SEM DADOS REAIS (ex.: apresentar ao Gabriel):
 *   npx tsx scripts/seed.ts --demo --env caminho/do/arquivo.env
 *   Gera uma senha nova para as contas de demonstração (mostrada só no fim) e recusa
 *   se o banco já tiver contas que não sejam as de demonstração.
 */
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

import type { Database, TablesInsert } from "../src/lib/supabase/database.types"
import { generateTempPassword, generateToken, hashToken } from "../src/lib/tokens"

const args = process.argv.slice(2)
const DEMO = args.includes("--demo")
const envIndex = args.indexOf("--env")
config({ path: envIndex >= 0 ? args[envIndex + 1] : ".env.local", quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const secret = process.env.SUPABASE_SECRET_KEY ?? ""
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost):54321/.test(url)
if (!LOCAL && !DEMO) {
  console.error(`Seed recusado: ${url || "(sem URL)"} não é o Supabase local. Para demonstração, use --demo.`)
  process.exit(1)
}

/** Senha de todas as contas fictícias (somente ambiente local). */
// Na demonstração (projeto remoto) a senha é nova a cada execução: a local está no repositório público.
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? (DEMO ? generateTempPassword() : "ritmus-local-123")

const SEED_STAFF = [
  // Na demonstração o perfil do Gabriel leva o WhatsApp real dele.
  { key: "gabriel", email: "gabriel@ritmus.test", full_name: "Gabriel Paiva", whatsapp: DEMO ? "15996363604" : "15991110001", role: "admin" },
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
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

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
  whatsapp?: string
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
  // Demonstração: aluno com WhatsApp real (o do Cauê), para ver as mensagens chegarem de verdade.
  ...(DEMO ? [{ name: "Cauê Belarmino", personal: "gabriel" as const, status: "ativo" as const, freq: 2, whatsapp: "11986435668" }] : []),
]

const GOALS = [["Emagrecer"], ["Ganhar massa muscular"], ["Condicionamento", "Saúde"], ["Emagrecer", "Condicionamento"], ["Saúde"]]

/** Depois do `supabase db reset` os serviços reiniciam: espera Auth e API responderem. */
async function waitForServices() {
  for (let attempt = 1; attempt <= 30; attempt++) {
    const [auth, rest] = await Promise.all([
      db.auth.admin.listUsers({ perPage: 1 }).catch((e) => ({ error: e })),
      db.from("studio_settings").select("id").limit(1),
    ])
    if (!auth.error && !rest.error) return
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error("O Supabase local não respondeu em 30s. Ele está rodando? (npm run db:start)")
}

async function main() {
  await waitForServices()
  if (DEMO) {
    // Proteção: só roda num banco sem contas reais.
    const { data: profiles } = await db.from("profiles").select("email")
    const real = (profiles ?? []).filter((p) => !SEED_STAFF.some((s) => s.email === p.email))
    if (real.length) {
      console.error(`Demonstração recusada: o banco já tem ${real.length} conta(s) que não são de demonstração.`)
      process.exit(1)
    }
    must(await db.from("studio_settings").update({ reference_fees: { "2": 28000, "3": 36000, "5": 50000 } }).eq("id", true))
  }
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
          whatsapp: s.whatsapp ?? `1599${String(2000000 + i * 7919).padStart(7, "0")}`,
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

  // ---------------------------------------------------------------------------
  // Agenda: feriados, 8 semanas de aulas passadas (presenças/faltas) e 2 semanas à frente
  // ---------------------------------------------------------------------------
  const year = Number(today().slice(0, 4))
  must(
    await db.from("closures").insert([
      { date: `${year}-11-02`, reason: "Finados" },
      { date: `${year}-11-20`, reason: "Consciência Negra" },
      { date: `${year}-12-25`, reason: "Natal" },
    ]),
  )
  const from = addDaysISO(today(), -56)
  must(await db.rpc("ensure_sessions", { p_from: from, p_to: addDaysISO(today(), 14) }))

  const { data: past } = await db
    .from("attendances")
    .select("id, student_id, session_id, class_sessions!inner(date, start_time, personal_id)")
    .lt("class_sessions.date", today())
  let rnd = 42
  const random = () => ((rnd = (rnd * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
  const updates: { id: string; status: "presente" | "falta" | "falta_justificada"; checked_in_at: string | null }[] = []
  for (const a of past ?? []) {
    const r = random()
    const status = r < 0.86 ? "presente" : r < 0.95 ? "falta" : "falta_justificada"
    const s = a.class_sessions as unknown as { date: string; start_time: string }
    updates.push({ id: a.id, status, checked_in_at: status === "presente" ? `${s.date}T${s.start_time}-03:00` : null })
  }
  for (const u of updates) {
    must(await db.from("attendances").update({ status: u.status, checked_in_at: u.checked_in_at }).eq("id", u.id))
  }

  // Reposições passadas: um aluno que faltou repõe numa aula do próprio personal com vaga.
  const { data: misses } = await db
    .from("attendances")
    .select("student_id, class_sessions!inner(date, personal_id)")
    .eq("status", "falta_justificada")
    .limit(6)
  let makeups = 0
  for (const m of misses ?? []) {
    const cs = m.class_sessions as unknown as { date: string; personal_id: string }
    const { data: options } = await db
      .from("session_occupancy")
      .select("session_id, date, start_time, taken, capacity")
      .eq("personal_id", cs.personal_id)
      .eq("status", "normal")
      .gt("date", cs.date)
      .lt("date", today())
      .order("date")
      .limit(10)
    const target = (options ?? []).find((o) => (o.taken ?? 0) < (o.capacity ?? 4))
    if (!target) continue
    const { error } = await db.from("attendances").insert({
      session_id: target.session_id!,
      student_id: m.student_id,
      kind: "reposicao",
      status: "presente",
      checked_in_at: `${target.date}T${target.start_time}-03:00`,
      created_by: cs.personal_id,
    })
    if (!error) makeups++
  }
  console.log(`✔ Agenda: ${updates.length} presenças passadas, ${makeups} reposições, 3 feriados`)

  // ---------------------------------------------------------------------------
  // Evolução: uma medição por semana (na primeira aula com presença), 8 semanas
  // ---------------------------------------------------------------------------
  const { data: initials } = await db.from("measurements").select("student_id, weight_kg").eq("source", "cadastro")
  const { data: presences } = await db
    .from("attendances")
    .select("student_id, session_id, class_sessions!inner(date, start_time, personal_id), students!inner(status, goals)")
    .eq("status", "presente")
    .eq("kind", "fixo")
    .eq("students.status", "ativo")
    .order("session_id")
  const rows: TablesInsert<"measurements">[] = []
  const seenWeek = new Set<string>()
  const sorted = [...(presences ?? [])].sort((a, b) =>
    (a.class_sessions as unknown as { date: string }).date.localeCompare((b.class_sessions as unknown as { date: string }).date),
  )
  const start = new Map<string, string>()
  for (const p of sorted) {
    const cs = p.class_sessions as unknown as { date: string; start_time: string; personal_id: string }
    const week = `${p.student_id}:${Math.floor((Date.parse(cs.date) - Date.parse(from)) / (7 * 86_400_000))}`
    if (seenWeek.has(week)) continue
    seenWeek.add(week)
    if (!start.has(p.student_id)) start.set(p.student_id, cs.date)
    const weeks = (Date.parse(cs.date) - Date.parse(start.get(p.student_id)!)) / (7 * 86_400_000)
    const base = Number(initials?.find((m) => m.student_id === p.student_id)?.weight_kg ?? 75)
    const gaining = ((p.students as unknown as { goals: string[] }).goals ?? []).includes("Ganhar massa muscular")
    const noise = (random() - 0.5) * 0.8
    const weight = base + (gaining ? 0.18 : -0.38) * weeks + noise
    const waist = 68 + (base - 58) * 0.7 - (gaining ? 0.05 : 0.45) * weeks + (random() - 0.5) * 0.8
    rows.push({
      client_id: crypto.randomUUID(),
      student_id: p.student_id,
      session_id: p.session_id,
      measured_at: `${cs.date}T${cs.start_time}-03:00`,
      weight_kg: Math.round(weight * 10) / 10,
      waist_cm: Math.round(waist * 10) / 10,
      abdomen_cm: Math.round((waist + 4 + (random() - 0.5)) * 10) / 10,
      created_by: cs.personal_id,
      source: "aula",
    })
  }
  for (let i = 0; i < rows.length; i += 200) must(await db.from("measurements").insert(rows.slice(i, i + 200)))
  console.log(`✔ Evolução: ${rows.length} medições semanais`)

  // ---------------------------------------------------------------------------
  // Financeiro: 2 meses anteriores + mês atual (pela mesma regra do app)
  // ---------------------------------------------------------------------------
  const todayISO = today()
  const todayDay = Number(todayISO.slice(8, 10))
  // Um aluno vence hoje; o mês atual dos demais segue o dia escolhido.
  const { data: billed } = await db
    .from("student_billing")
    .select("student_id, monthly_fee_cents, due_day, students!inner(full_name, status)")
    .not("monthly_fee_cents", "is", null)
    .eq("students.status", "ativo")
    .order("student_id")
  for (const name of ["Mariana Oliveira", "Cauê Belarmino"]) {
    const dueToday = billed?.find((b) => (b.students as unknown as { full_name: string }).full_name === name)
    if (dueToday) must(await db.from("student_billing").update({ due_day: todayDay }).eq("student_id", dueToday.student_id))
  }

  const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
  const dueIn = (competence: string, day: number) => {
    const [y, m] = competence.split("-").map(Number) as [number, number]
    return `${competence.slice(0, 7)}-${String(Math.min(day, lastDay(y, m))).padStart(2, "0")}`
  }
  const monthOf = (iso: string, back: number) => {
    const [y, m] = iso.split("-").map(Number) as [number, number]
    const d = new Date(Date.UTC(y, m - 1 - back, 1))
    return d.toISOString().slice(0, 10)
  }
  const overdueNames = ["Thiago Rodrigues", "Bianca Pereira"] // atrasados no mês passado
  const { data: firstClasses } = await db
    .from("enrollments")
    .select("student_id, starts_on, time_slots(weekday)")
  const firstClass = (studentId: string) =>
    (firstClasses ?? [])
      .filter((e) => e.student_id === studentId)
      .map((e) => addDaysISO(e.starts_on, ((e.time_slots as unknown as { weekday: number }).weekday - new Date(`${e.starts_on}T12:00:00Z`).getUTCDay() + 7) % 7))
      .sort()[0]

  const chargeRows: TablesInsert<"charges">[] = []
  for (const b of billed ?? []) {
    const name = (b.students as unknown as { full_name: string }).full_name
    const first = firstClass(b.student_id)
    if (!first) continue
    for (const back of [2, 1]) {
      const competence = monthOf(todayISO, back)
      if (first.slice(0, 7) > competence.slice(0, 7)) continue
      const due = first.slice(0, 7) === competence.slice(0, 7) ? addDaysISO(first, 7) : dueIn(competence, b.due_day)
      const overdue = back === 1 && overdueNames.includes(name)
      chargeRows.push({
        student_id: b.student_id,
        competence,
        amount_cents: b.monthly_fee_cents!,
        due_date: due,
        status: overdue ? "pendente" : "pago",
        paid_on: overdue ? null : addDaysISO(due, Math.floor(random() * 4) - 2),
        payment_method: overdue ? null : random() < 0.75 ? "pix" : random() < 0.6 ? "dinheiro" : "cartao",
      })
    }
  }
  must(await db.from("charges").insert(chargeRows))
  must(await db.rpc("ensure_monthly_charges"))
  // Mês atual: quem já venceu pagou, menos um (atraso) e quem vence hoje.
  const { data: current } = await db
    .from("charges_view")
    .select("id, full_name, due_date, amount_cents")
    .eq("competence", monthOf(todayISO, 0))
  for (const c of current ?? []) {
    if (c.due_date! < todayISO && c.full_name !== "Lucas Santos") {
      must(await db.from("charges").update({ status: "pago", paid_on: c.due_date!, payment_method: "pix" }).eq("id", c.id!))
    }
  }
  console.log(`✔ Financeiro: ${chargeRows.length + (current?.length ?? 0)} mensalidades (atrasos: ${overdueNames.join(", ")} e Lucas Santos; vence hoje: Mariana Oliveira)`)

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

  if (DEMO) {
    console.log(`\nContas de demonstração: ${SEED_STAFF.map((s) => s.email).join(" · ")}`)
    console.log(`Senha (mostrada só agora): ${SEED_PASSWORD}`)
  } else {
    console.log(`\nContas: ${SEED_STAFF.map((s) => s.email).join(" · ")} — senha em scripts/seed.ts (SEED_PASSWORD)`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
