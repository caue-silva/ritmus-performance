import { expect, test } from "@playwright/test"

import { login, service, USERS } from "./support"

/** Dia útil mais recente (hoje, se for seg–sex): tem aulas no seed e aceita check-in. */
function lastWeekday() {
  const d = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) + "T12:00:00Z")
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

test("personal: check-in com Desfazer, falta libera vaga, reposição e cancelar/reabrir", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const date = lastWeekday()
  const db = service()
  const { data: ana } = await db.from("profiles").select("id").eq("email", USERS.personal).single()
  const { data: session } = await db
    .from("class_sessions")
    .select("id")
    .eq("personal_id", ana!.id)
    .eq("date", date)
    .eq("start_time", "09:00:00")
    .single()

  await login(page, USERS.personal)
  await page.goto(`/agenda?data=${date}&visao=dia`)
  await page.getByRole("link", { name: /^9h/ }).click()
  await expect(page).toHaveURL(new RegExp(`/agenda/aula/${session!.id}`))

  const list = page.getByRole("list", { name: "Alunos do horário" })
  const first = list.getByRole("listitem").first()
  const checkIn = first.getByRole("button", { name: /Check-in|Chegou/ })
  const wasPresent = (await checkIn.getAttribute("aria-pressed")) === "true"
  if (wasPresent) {
    await checkIn.click()
    await expect(checkIn).toHaveAttribute("aria-pressed", "false")
  }

  // Check-in em 1 toque, com Desfazer
  await checkIn.click()
  await expect(checkIn).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText(/chegou\.$/).last()).toBeVisible()
  await page.getByRole("button", { name: "Desfazer" }).last().click()
  await expect(checkIn).toHaveAttribute("aria-pressed", "false")

  // Falta justificada libera a vaga
  const before = await page.getByText(/^\d\/4$/).first().textContent()
  await first.getByRole("button", { name: /Mais opções/ }).click()
  await page.getByRole("button", { name: "Falta justificada" }).click()
  await expect(page.getByText(/^\d\/4$/).first()).not.toHaveText(before!)

  // Reposição no horário liberado
  await page.getByRole("button", { name: "Adicionar reposição" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByRole("option").first().click()
  const picked = (await sheet.getByRole("option").first().locator("span span").first().textContent())!.trim()
  await sheet.getByRole("button", { name: /Registrar reposição/ }).click()
  const makeupRow = list.getByRole("listitem").filter({ hasText: picked })
  await expect(makeupRow).toContainText("Reposição")

  // Remover a reposição e desfazer a falta (deixa os dados como estavam)
  await makeupRow.getByRole("button", { name: /Mais opções/ }).click()
  await page.getByRole("button", { name: "Remover reposição" }).click()
  await expect(list.getByRole("listitem").filter({ hasText: picked })).toHaveCount(0)
  await list.getByRole("listitem").filter({ hasText: "Falta justificada" }).first().getByRole("button", { name: /Mais opções/ }).click()
  await page.getByRole("button", { name: /Desfazer falta|Vai vir/ }).click()
  await expect(page.getByText(before!).first()).toBeVisible()
  if (wasPresent) await checkIn.click()

  // Cancelar e reabrir
  await page.getByRole("button", { name: "Cancelar aula" }).click()
  await page.getByRole("button", { name: "Cancelar esta aula" }).click()
  await expect(page.getByText("Aula cancelada").first()).toBeVisible()
  await page.getByRole("button", { name: "Reabrir aula" }).click()
  await expect(page.getByRole("button", { name: "Cancelar aula" })).toBeVisible()
})

test("personal não abre aula de outro personal", async ({ page }) => {
  const db = service()
  const { data: bruno } = await db.from("profiles").select("id").eq("email", "bruno@ritmus.test").single()
  const { data: s } = await db.from("class_sessions").select("id").eq("personal_id", bruno!.id).limit(1).single()
  await login(page, USERS.personal)
  await page.goto(`/agenda/aula/${s!.id}`)
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible()
})

test("admin: grade de horários bloqueia remover horário com alunos fixos e cria horário novo", async ({ page }) => {
  await login(page, USERS.admin)
  await page.goto("/configuracoes/horarios?dia=6")
  const row = page.getByRole("listitem").filter({ hasText: /^11h/ })
  await row.getByRole("radio", { name: "Bruno" }).click()
  await expect(page.getByText("Sáb 11h: Bruno.")).toBeVisible()
  await row.getByRole("radio", { name: "Sem aula" }).click()
  await expect(page.getByText("Sáb 11h sem aula.")).toBeVisible()

  await page.goto("/configuracoes/horarios?dia=1")
  const busy = page.getByRole("listitem").filter({ hasText: "fixo" }).first()
  await busy.getByRole("radio", { name: "Sem aula" }).click()
  await expect(page.getByText(/Troque os horários deles na ficha/)).toBeVisible()
})
