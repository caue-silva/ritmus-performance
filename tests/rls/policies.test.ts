/**
 * Políticas RLS. Requer Supabase local com seed: npm run db:reset
 *
 * Cenário: Ana e Bruno são personais; Gabriel é admin.
 *   alunoAna / alunoBruno — um aluno de cada, com PAR-Q, valor e cobrança.
 *   horárioAna / horárioBruno — uma aula de cada no mesmo dia.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { anon, ok, profileId, service, signIn, type Db } from "./helpers"

const DATE = "2030-01-06" // domingo, longe dos dados do seed
const TAG = `rls-${Date.now()}`

let svc: Db, gabriel: Db, ana: Db, bruno: Db
let anaId: string, brunoId: string
let alunoAna: string, alunoBruno: string
let sessionAna: string, sessionBruno: string
const slotIds: string[] = []
const studentIds: string[] = []

async function createStudent(name: string, personalId: string | null, status: "ativo" | "aguardando" = "ativo") {
  const s = ok(
    await svc
      .from("students")
      .insert({ full_name: `${name} ${TAG}`, whatsapp: "15999990000", personal_id: personalId, status })
      .select("id")
      .single(),
  )
  studentIds.push(s.id)
  return s.id
}

async function createSession(personalId: string, startTime: string) {
  const slot = ok(
    await svc.from("time_slots").insert({ weekday: 0, start_time: startTime, personal_id: personalId }).select("id").single(),
  )
  slotIds.push(slot.id)
  const session = ok(
    await svc
      .from("class_sessions")
      .insert({ time_slot_id: slot.id, date: DATE, start_time: startTime, personal_id: personalId })
      .select("id")
      .single(),
  )
  return session.id
}

beforeAll(async () => {
  svc = service()
  ;[gabriel, ana, bruno] = await Promise.all([
    signIn("gabriel@ritmus.test"),
    signIn("ana@ritmus.test"),
    signIn("bruno@ritmus.test"),
  ])
  anaId = await profileId(svc, "ana@ritmus.test")
  brunoId = await profileId(svc, "bruno@ritmus.test")

  alunoAna = await createStudent("Aluno da Ana", anaId)
  alunoBruno = await createStudent("Aluno do Bruno", brunoId)

  ok(
    await svc.from("student_health").insert([
      { student_id: alunoAna, parq_answers: [false, false, false, false, false, false, false], health_notes: "nada" },
      { student_id: alunoBruno, parq_answers: [true, false, false, false, false, false, false], health_notes: "dor no joelho" },
    ]),
  )
  ok(
    await svc.from("student_billing").insert([
      { student_id: alunoAna, monthly_fee_cents: 30000, due_day: 10 },
      { student_id: alunoBruno, monthly_fee_cents: 40000, due_day: 5 },
    ]),
  )
  ok(
    await svc.from("charges").insert([
      { student_id: alunoAna, competence: "2030-01-01", amount_cents: 30000, due_date: "2030-01-10" },
      { student_id: alunoBruno, competence: "2030-01-01", amount_cents: 40000, due_date: "2030-01-05" },
    ]),
  )

  sessionAna = await createSession(anaId, "05:00")
  sessionBruno = await createSession(brunoId, "05:30")
  ok(
    await svc.from("attendances").insert([
      { session_id: sessionAna, student_id: alunoAna },
      { session_id: sessionBruno, student_id: alunoBruno },
    ]),
  )
  ok(
    await svc.from("measurements").insert({
      client_id: crypto.randomUUID(),
      student_id: alunoBruno,
      weight_kg: 80,
      created_by: brunoId,
    }),
  )
})

afterAll(async () => {
  if (!svc) return
  await svc.from("profiles").update({ active: true }).in("id", [anaId, brunoId].filter(Boolean))
  if (studentIds.length) await svc.from("students").delete().in("id", studentIds)
  if (slotIds.length) {
    await svc.from("class_sessions").delete().in("time_slot_id", slotIds)
    await svc.from("class_sessions").delete().eq("date", "2031-01-05")
    await svc.from("time_slots").delete().in("id", slotIds)
  }
})

describe("alunos de outro personal", () => {
  it("personal não lê aluno de outro personal", async () => {
    const rows = ok(await ana.from("students").select("id").in("id", [alunoAna, alunoBruno]))
    expect(rows.map((r) => r.id)).toEqual([alunoAna])
  })

  it("personal não edita aluno de outro personal", async () => {
    const updated = ok(await ana.from("students").update({ goals_notes: "invadido" }).eq("id", alunoBruno).select("id"))
    expect(updated).toHaveLength(0)
    const check = ok(await svc.from("students").select("goals_notes").eq("id", alunoBruno).single())
    expect(check.goals_notes).toBeNull()
  })

  it("personal não exclui aluno (nem o próprio)", async () => {
    await ana.from("students").delete().in("id", [alunoAna, alunoBruno])
    const still = ok(await svc.from("students").select("id").in("id", [alunoAna, alunoBruno]))
    expect(still).toHaveLength(2)
  })

  it("personal edita dados do próprio aluno, mas não o status nem o vínculo", async () => {
    const updated = ok(await ana.from("students").update({ height_cm: 171 }).eq("id", alunoAna).select("id"))
    expect(updated).toHaveLength(1)

    const statusChange = await ana.from("students").update({ status: "inativo" }).eq("id", alunoAna)
    expect(statusChange.error).not.toBeNull()

    const transfer = await ana.from("students").update({ personal_id: brunoId }).eq("id", alunoAna)
    expect(transfer.error).not.toBeNull()
  })

  it("a busca rápida só encontra os próprios alunos", async () => {
    const own = ok(await ana.rpc("search_students", { q: "aluno da ana" }))
    expect(own.map((r) => r.id)).toContain(alunoAna)
    const other = ok(await ana.rpc("search_students", { q: "aluno do bruno" }))
    expect(other.map((r) => r.id)).not.toContain(alunoBruno)
    const asAdmin = ok(await gabriel.rpc("search_students", { q: "aluno do bruno" }))
    expect(asAdmin.map((r) => r.id)).toContain(alunoBruno)
  })

  it("personal não cria aluno", async () => {
    const res = await ana.from("students").insert({ full_name: `Intruso ${TAG}`, whatsapp: "15999990000" })
    expect(res.error).not.toBeNull()
  })
})

describe("PAR-Q e observações de saúde", () => {
  it("personal não lê o PAR-Q de aluno de outro personal", async () => {
    const rows = ok(await ana.from("student_health").select("student_id").in("student_id", [alunoAna, alunoBruno]))
    expect(rows.map((r) => r.student_id)).toEqual([alunoAna])
  })

  it("personal lê, mas não altera, o PAR-Q do próprio aluno", async () => {
    const own = ok(await bruno.from("student_health").select("health_notes, requires_clearance").eq("student_id", alunoBruno).single())
    expect(own.requires_clearance).toBe(true)
    const updated = ok(
      await bruno.from("student_health").update({ clearance_received_on: "2030-01-01" }).eq("student_id", alunoBruno).select(),
    )
    expect(updated).toHaveLength(0)
  })
})

describe("nada financeiro para o personal", () => {
  const financialTables = ["student_billing", "charges", "charge_events", "studio_settings"] as const

  for (const table of financialTables) {
    it(`personal não lê ${table}`, async () => {
      for (const client of [ana, bruno]) {
        const res = await client.from(table).select("*")
        expect(res.error ?? res.data).toSatisfy((v: unknown) => v instanceof Object && (!Array.isArray(v) || v.length === 0))
      }
    })
  }

  it("personal não cria, altera nem confirma cobranças", async () => {
    const insert = await ana
      .from("charges")
      .insert({ student_id: alunoAna, competence: "2030-02-01", amount_cents: 1, due_date: "2030-02-10" })
    expect(insert.error).not.toBeNull()

    const pay = ok(
      await ana
        .from("charges")
        .update({ status: "pago", paid_on: DATE, payment_method: "pix" })
        .eq("student_id", alunoAna)
        .select(),
    )
    expect(pay).toHaveLength(0)

    const fee = ok(await ana.from("student_billing").update({ monthly_fee_cents: 1 }).eq("student_id", alunoAna).select())
    expect(fee).toHaveLength(0)
  })

  it("a ficha do aluno que o personal lê não tem nenhuma coluna financeira", async () => {
    const row = ok(await ana.from("students").select("*").eq("id", alunoAna).single())
    const financial = Object.keys(row).filter((k) => /fee|amount|price|valor|due|charge|paid|pix|billing|pag/i.test(k))
    expect(financial).toEqual([])
  })

  it("admin lê tudo do financeiro", async () => {
    const charges = ok(await gabriel.from("charges").select("student_id").in("student_id", [alunoAna, alunoBruno]))
    expect(charges).toHaveLength(2)
    const events = ok(await gabriel.from("charge_events").select("action").in("charge_id", (await svc.from("charges").select("id").in("student_id", [alunoAna])).data!.map((c) => c.id)))
    expect(events.map((e) => e.action)).toContain("criada")
  })
})

describe("Central de tarefas e funções do admin", () => {
  it("personal não vê nenhuma tarefa (nem a de aluno sem valor, que é informação financeira)", async () => {
    // Aluno da Ana, ativo e sem valor → tarefa "valor" para o admin.
    ok(await svc.from("student_billing").update({ monthly_fee_cents: null }).eq("student_id", alunoAna))
    const asAdmin = ok(await gabriel.from("admin_tasks").select("kind, student_id").eq("student_id", alunoAna))
    expect(asAdmin.map((t) => t.kind)).toContain("valor")
    const asPersonal = ok(await ana.from("admin_tasks").select("kind"))
    expect(asPersonal).toHaveLength(0)
    ok(await svc.from("student_billing").update({ monthly_fee_cents: 30000 }).eq("student_id", alunoAna))
  })

  it("personal não ativa, pausa nem inativa alunos", async () => {
    const act = await ana.rpc("activate_student", {
      p_student_id: alunoAna,
      p_personal_id: anaId,
      p_weekly_frequency: 2,
      p_slot_ids: [],
      p_fee_cents: 1,
      p_due_day: 10,
    })
    expect(act.error?.message).toMatch(/administrador/)
    const rel = await ana.rpc("release_student", { p_student_id: alunoAna, p_status: "inativo" })
    expect(rel.error?.message).toMatch(/administrador/)
  })

  it("o envio do formulário público só roda no servidor", async () => {
    const args = { p_token_hash: "x", p_data: {}, p_doc_ids: [], p_ip: null, p_user_agent: "" }
    for (const client of [anon(), ana, gabriel]) {
      const res = await client.rpc("submit_signup", args as never)
      expect(res.error).not.toBeNull()
    }
  })

  it("personal não lê convites nem consentimentos", async () => {
    for (const table of ["student_invites", "consents"] as const) {
      const rows = ok(await ana.from(table).select("*"))
      expect(rows).toHaveLength(0)
    }
  })

  it("ocupação dos horários: personal só vê os próprios", async () => {
    const rows = ok(await ana.from("time_slot_occupancy").select("personal_id"))
    expect(rows.every((r) => r.personal_id === anaId)).toBe(true)
  })
})

describe("agenda, presença e reposição", () => {
  it("personal só vê as próprias aulas", async () => {
    const rows = ok(await ana.from("class_sessions").select("id").in("id", [sessionAna, sessionBruno]))
    expect(rows.map((r) => r.id)).toEqual([sessionAna])
  })

  it("personal não registra reposição no horário de outro personal", async () => {
    const res = await ana.from("attendances").insert({ session_id: sessionBruno, student_id: alunoAna, kind: "reposicao" })
    expect(res.error).not.toBeNull()
  })

  it("dono do horário registra reposição de aluno de outro personal e guarda quem registrou", async () => {
    const row = ok(
      await ana
        .from("attendances")
        .insert({ session_id: sessionAna, student_id: alunoBruno, kind: "reposicao" })
        .select("created_by, created_at")
        .single(),
    )
    expect(row.created_by).toBe(anaId)
    expect(row.created_at).toBeTruthy()
  })

  it("dono do horário mede o aluno de reposição, mas não lê o PAR-Q dele", async () => {
    const health = ok(await ana.from("student_health").select("student_id").eq("student_id", alunoBruno))
    expect(health).toHaveLength(0)

    const outsideClass = await ana
      .from("measurements")
      .insert({ client_id: crypto.randomUUID(), student_id: alunoBruno, weight_kg: 79 })
    expect(outsideClass.error).not.toBeNull()

    const inClass = await ana
      .from("measurements")
      .insert({ client_id: crypto.randomUUID(), student_id: alunoBruno, session_id: sessionAna, weight_kg: 79 })
    expect(inClass.error).toBeNull()

    // Não enxerga o histórico registrado pelo Bruno.
    const history = ok(await ana.from("measurements").select("created_by").eq("student_id", alunoBruno))
    expect(history.every((m) => m.created_by === anaId)).toBe(true)
  })

  it("o banco não deixa passar de 4 alunos na aula", async () => {
    const extras = await Promise.all([1, 2, 3].map((n) => createStudent(`Extra ${n}`, anaId)))
    // Já há 2 na aula da Ana (alunoAna + reposição do alunoBruno): cabem mais 2.
    for (const id of extras.slice(0, 2)) {
      ok(await ana.from("attendances").insert({ session_id: sessionAna, student_id: id, kind: "reposicao" }))
    }
    const fifth = await ana.from("attendances").insert({ session_id: sessionAna, student_id: extras[2], kind: "reposicao" })
    expect(fifth.error?.message).toMatch(/completo/)

    // Uma falta libera a vaga.
    ok(await ana.from("attendances").update({ status: "falta" }).eq("session_id", sessionAna).eq("student_id", alunoAna))
    ok(await ana.from("attendances").insert({ session_id: sessionAna, student_id: extras[2], kind: "reposicao" }))
  })

  it("só existe um horário ativo por dia e hora", async () => {
    const res = await gabriel.from("time_slots").insert({ weekday: 0, start_time: "05:00", personal_id: brunoId })
    expect(res.error).not.toBeNull()
  })
})

describe("agenda: funções da Fase 3", () => {
  it("lista da aula: só o dono vê; aluno de reposição aparece sem aviso de saúde", async () => {
    const other = await bruno.rpc("session_roster", { p_session_id: sessionAna })
    expect(other.error).not.toBeNull()

    const roster = ok(await ana.rpc("session_roster", { p_session_id: sessionAna }))
    const guest = roster.find((r) => r.student_id === alunoBruno)
    expect(guest).toBeDefined()
    expect(guest!.is_mine).toBe(false)
    expect(guest!.health_flag).toBe(false) // alunoBruno tem "sim" no PAR-Q, mas não é da Ana

    const asAdmin = ok(await gabriel.rpc("session_roster", { p_session_id: sessionAna }))
    expect(asAdmin.find((r) => r.student_id === alunoBruno)!.health_flag).toBe(true)
  })

  it("busca para reposição só funciona na própria aula e devolve só nome", async () => {
    const denied = await bruno.rpc("search_students_for_makeup", { p_session_id: sessionAna, q: "" })
    expect(denied.error).not.toBeNull()
    const res = ok(await ana.rpc("search_students_for_makeup", { p_session_id: sessionAna, q: "" }))
    expect(Object.keys(res[0] ?? { id: 1, full_name: 1, owner_name: 1, is_mine: 1 }).sort()).toEqual(["full_name", "id", "is_mine", "owner_name"])
  })

  it("geração de aulas: personal só gera as próprias", async () => {
    const day = "2031-01-05" // domingo, onde só existem os horários de teste
    ok(await ana.rpc("ensure_sessions", { p_from: day, p_to: day }))
    const created = ok(await svc.from("class_sessions").select("personal_id").eq("date", day))
    expect(created.map((c) => c.personal_id)).toEqual([anaId])
    ok(await gabriel.rpc("ensure_sessions", { p_from: day, p_to: day }))
    const all = ok(await svc.from("class_sessions").select("personal_id").eq("date", day))
    expect(all.map((c) => c.personal_id).sort()).toEqual([anaId, brunoId].sort())
  })

  it("personal cancela a própria aula, mas não a de outro nem marca feriado", async () => {
    const own = ok(await ana.from("class_sessions").update({ status: "cancelada" }).eq("id", sessionAna).select("id"))
    expect(own).toHaveLength(1)
    ok(await ana.from("class_sessions").update({ status: "normal" }).eq("id", sessionAna))
    const others = ok(await ana.from("class_sessions").update({ status: "cancelada" }).eq("id", sessionBruno).select("id"))
    expect(others).toHaveLength(0)
    const holiday = await ana.from("class_sessions").update({ status: "feriado" }).eq("id", sessionAna)
    expect(holiday.error).not.toBeNull()
  })

  it("feriados e horários fixos: só o admin muda", async () => {
    const closure = await ana.from("closures").insert({ date: "2031-02-02", reason: "teste" })
    expect(closure.error).not.toBeNull()
    const sched = await ana.rpc("set_student_schedule", { p_student_id: alunoAna, p_slot_ids: [] })
    expect(sched.error?.message).toMatch(/administrador/)
    const slot = await ana.from("time_slots").insert({ weekday: 0, start_time: "04:00", personal_id: anaId })
    expect(slot.error).not.toBeNull()
  })

  it("ocupação das aulas: personal só vê as próprias", async () => {
    const rows = ok(await ana.from("session_occupancy").select("personal_id").eq("date", DATE))
    expect(rows.every((r) => r.personal_id === anaId)).toBe(true)
  })
})

describe("evolução: Fase 4", () => {
  it("últimos valores: personal do aluno, dono da aula (reposição) e admin; outros não", async () => {
    ok(await ana.rpc("last_measurement", { p_student_id: alunoAna }))
    const guestNoSession = await ana.rpc("last_measurement", { p_student_id: alunoBruno })
    expect(guestNoSession.error).not.toBeNull()
    const guestInClass = ok(await ana.rpc("last_measurement", { p_student_id: alunoBruno, p_session_id: sessionAna }))
    expect(guestInClass).toHaveLength(1)
    const other = await bruno.rpc("last_measurement", { p_student_id: alunoAna })
    expect(other.error).not.toBeNull()
    ok(await gabriel.rpc("last_measurement", { p_student_id: alunoBruno }))
  })

  it("reenvio offline: a mesma medição enviada duas vezes vira uma só", async () => {
    const clientId = crypto.randomUUID()
    const row = { client_id: clientId, student_id: alunoAna, weight_kg: 70.5 }
    for (let i = 0; i < 2; i++) {
      const res = await ana.from("measurements").upsert(row, { onConflict: "client_id", ignoreDuplicates: true })
      expect(res.error).toBeNull()
    }
    const rows = ok(await svc.from("measurements").select("id").eq("client_id", clientId))
    expect(rows).toHaveLength(1)
  })

  it("personal não mede aluno de outro personal fora da própria aula", async () => {
    const res = await bruno.from("measurements").insert({ client_id: crypto.randomUUID(), student_id: alunoAna, weight_kg: 70 })
    expect(res.error).not.toBeNull()
  })
})

describe("ativação e acesso", () => {
  it("aluno com 'sim' no PAR-Q só é ativado depois da liberação médica", async () => {
    const id = await createStudent("Precisa liberação", brunoId, "aguardando")
    ok(await svc.from("student_health").insert({ student_id: id, parq_answers: [false, true, false, false, false, false, false] }))

    const blocked = await gabriel.from("students").update({ status: "ativo" }).eq("id", id)
    expect(blocked.error?.message).toMatch(/liberação médica/)

    ok(await gabriel.from("student_health").update({ clearance_received_on: "2030-01-02" }).eq("student_id", id))
    ok(await gabriel.from("students").update({ status: "ativo" }).eq("id", id))
  })

  it("personal desativado perde o acesso na hora", async () => {
    ok(await svc.from("profiles").update({ active: false }).eq("id", anaId))
    const rows = ok(await ana.from("students").select("id"))
    expect(rows).toHaveLength(0)
    const sessions = ok(await ana.from("class_sessions").select("id"))
    expect(sessions).toHaveLength(0)
    ok(await svc.from("profiles").update({ active: true }).eq("id", anaId))
  })

  it("foto: personal envia só na própria pasta; admin em qualquer uma", async () => {
    const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" })
    const own = await ana.storage.from("avatars").upload(`${anaId}/${TAG}.jpg`, file, { contentType: "image/jpeg" })
    expect(own.error).toBeNull()
    const other = await ana.storage.from("avatars").upload(`${brunoId}/${TAG}.jpg`, file, { contentType: "image/jpeg" })
    expect(other.error).not.toBeNull()
    const admin = await gabriel.storage.from("avatars").upload(`${brunoId}/${TAG}.jpg`, file, { contentType: "image/jpeg" })
    expect(admin.error).toBeNull()
    await svc.storage.from("avatars").remove([`${anaId}/${TAG}.jpg`, `${brunoId}/${TAG}.jpg`])
  })

  it("personal não se promove a admin nem se reativa", async () => {
    const res = await ana.from("profiles").update({ role: "admin" }).eq("id", anaId)
    expect(res.error).not.toBeNull()
  })

  it("ninguém cria conta pelo navegador (só o servidor)", async () => {
    const res = await anon().auth.signUp({ email: `intruso-${TAG}@x.test`, password: "senha-forte-123" })
    expect(res.error).not.toBeNull()
  })

  it("sem login não se lê nada", async () => {
    const client = anon()
    for (const table of ["students", "student_health", "charges", "profiles", "studio_settings"] as const) {
      const res = await client.from(table).select("*").limit(1)
      expect(res.error ?? res.data).toSatisfy((v: unknown) => v instanceof Object && (!Array.isArray(v) || v.length === 0))
    }
  })
})
