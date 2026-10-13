import { expect, test, type Page } from "@playwright/test"

import { login, service, USERS } from "./support"

function lastWeekday() {
  const d = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) + "T12:00:00Z")
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function openAnaSession(page: Page) {
  const db = service()
  const { data: ana } = await db.from("profiles").select("id").eq("email", USERS.personal).single()
  const { data: s } = await db
    .from("class_sessions")
    .select("id")
    .eq("personal_id", ana!.id)
    .eq("date", lastWeekday())
    .eq("start_time", "09:00:00")
    .single()
  await login(page, USERS.personal)
  await page.goto(`/agenda/aula/${s!.id}`)
  return page.getByRole("list", { name: "Alunos do horário" }).getByRole("listitem").first()
}

const studentName = async (row: ReturnType<Page["getByRole"]>) =>
  ((await row.getByRole("button", { name: /Registrar medição/ }).getAttribute("aria-label")) ?? "").split(":")[0]!

test("medição na aula: campos grandes, IMC na hora, salvar com Desfazer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const row = await openAnaSession(page)
  const name = await studentName(row)
  const db = service()
  const { count: before } = await db.from("measurements").select("id", { count: "exact", head: true })

  await row.getByRole("button", { name: /Registrar medição/ }).click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByText(/Última:/).first()).toBeVisible()
  await sheet.getByLabel("Peso").fill("71,4")
  await sheet.getByLabel("Cintura").fill("80")
  await sheet.getByLabel("Abdômen").fill("84,5")
  await expect(sheet.getByText(/IMC \d/)).toBeVisible()
  await sheet.getByRole("button", { name: "Salvar medição" }).click()
  await expect(page.getByText(new RegExp(`Medição de ${name.split(" ")[0]} salva`))).toBeVisible()
  await expect(row).toContainText("Medido hoje")
  const { count: after } = await db.from("measurements").select("id", { count: "exact", head: true })
  expect(after).toBe((before ?? 0) + 1)

  await page.getByRole("listitem").filter({ hasText: "Medição de" }).getByRole("button", { name: "Desfazer" }).click()
  await expect.poll(async () => (await db.from("measurements").select("id", { count: "exact", head: true })).count).toBe(before)
})

test("sem internet: a medição fica pendente no aparelho e é enviada quando a conexão volta", async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const row = await openAnaSession(page)
  const db = service()

  const weight = 60 + Math.round(Math.random() * 300) / 10 // valor único deste teste
  await context.setOffline(true)
  await row.getByRole("button", { name: /Registrar medição/ }).click()
  await page.getByRole("dialog").getByLabel("Peso").fill(String(weight).replace(".", ","))
  await page.getByRole("dialog").getByRole("button", { name: "Salvar medição" }).click()
  await expect(page.getByText(/Sem internet/)).toBeVisible()
  await expect(page.getByRole("button", { name: /1 pendente/ })).toBeVisible()
  await expect(row).toContainText("Envio pendente")

  await context.setOffline(false)
  await expect(page.getByText("Medição pendente enviada.")).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole("button", { name: /pendente/ })).toHaveCount(0)
  const { data } = await db.from("measurements").select("id").eq("weight_kg", weight).gte("measured_at", new Date(Date.now() - 120_000).toISOString())
  await db.from("measurements").delete().in("id", (data ?? []).map((m) => m.id))
  expect(data).toHaveLength(1)
})

test("evolução e presença na ficha do aluno", async ({ page }) => {
  const db = service()
  const { data: s } = await db.from("students").select("id").eq("full_name", "Diego Carvalho").single()
  await login(page, USERS.personal)
  await page.goto(`/alunos/${s!.id}?aba=evolucao`)
  await expect(page.getByRole("img", { name: /Peso: de/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /Peso/ }).first()).toContainText(/desde/)
  await page.getByRole("button", { name: /Cintura/ }).first().click()
  await expect(page.getByRole("img", { name: /Cintura: de/ })).toBeVisible()
  await page.getByRole("button", { name: "30 dias" }).click()
  await expect(page.getByRole("table")).toBeVisible()

  await page.getByRole("link", { name: "Presença" }).click()
  await expect(page.getByRole("heading", { name: "Frequência por mês" })).toBeVisible()
  await expect(page.getByRole("img", { name: /Frequência por mês/ })).toBeVisible()
})
