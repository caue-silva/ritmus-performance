import { expect, test } from "@playwright/test"
import sharp from "sharp"

import { login, service, USERS } from "./support"

const TAG = `e2e-f7-${Date.now().toString(36)}`
const month = () => `${new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 7)}-01`

async function personalId(email: string) {
  const { data } = await service().from("profiles").select("id").eq("email", email).single()
  return data!.id
}

test.afterAll(async () => {
  const db = service()
  await db.from("staff_payouts").delete().eq("month", month())
  await db.from("staff_commission_rates").delete().gt("valid_from", month())
  const { data: camps } = await db.from("campaigns").select("id, image_url").like("title", `${TAG}%`)
  for (const c of camps ?? []) {
    if (c.image_url) await db.storage.from("campaigns").remove([c.image_url.split("/campaigns/")[1]!])
    await db.from("campaigns").delete().eq("id", c.id)
  }
  await db.from("students").delete().like("full_name", `${TAG}%`)
})

test("repasses: comissão + bônus de campanha, marcar como pago e desfazer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await login(page, USERS.admin)
  await page.goto("/financeiro")
  await page.getByRole("link", { name: "Repasses" }).click()
  const card = page.getByRole("article").filter({ hasText: "Ana" })
  await expect(card).toContainText("Comissão 65%")
  await expect(card).toContainText("Bônus de campanha")

  await card.getByRole("button", { name: /Ver \d+ pagamento/ }).click()
  await expect(card.getByText(/Bônus R\$/)).toBeVisible()

  await card.getByRole("button", { name: "Marcar como pago" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByRole("button", { name: /^Registrar R\$/ }).click()
  await expect(page.getByText(/Repasse de Ana registrado/)).toBeVisible()
  await expect(card.getByText("Pago", { exact: true })).toBeVisible()
  const { data: row } = await service().from("staff_payouts").select("amount_cents, payment_method").eq("month", month()).eq("personal_id", await personalId("ana@ritmus.test")).single()
  expect(row).toMatchObject({ payment_method: "pix" })
  expect(row!.amount_cents).toBeGreaterThan(0)

  await card.getByRole("button", { name: "Desfazer pagamento" }).click()
  await expect(card.getByRole("button", { name: "Marcar como pago" })).toBeVisible()
})

test("equipe: muda a comissão a partir do mês que vem", async ({ page }) => {
  await login(page, USERS.admin)
  await page.goto("/equipe")
  const card = page.getByRole("listitem").filter({ hasText: "bruno@ritmus.test" })
  await expect(card).toContainText("65% da mensalidade")
  await card.getByRole("button", { name: "Comissão e ranking" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByLabel(/Comissão/).fill("70")
  const [y, m] = month().split("-").map(Number) as [number, number]
  const next = new Date(Date.UTC(y, m, 1))
  await sheet.getByLabel("Vale para pagamentos a partir de").fill(`01${String(next.getUTCMonth() + 1).padStart(2, "0")}${next.getUTCFullYear()}`)
  await sheet.getByRole("button", { name: "Salvar" }).click()
  await expect(card).toContainText("65% da mensalidade")
  await expect(card).toContainText("70% a partir de 01/")
})

test("campanha com arte aparece no Agora do professor", async ({ page, browser }) => {
  await login(page, USERS.admin)
  await page.goto("/campanhas")
  await page.getByRole("link", { name: "Nova campanha" }).click()
  const art = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#F05B2A" } }).png().toBuffer()
  await page.locator('input[type="file"]').setInputFiles({ name: "arte.png", mimeType: "image/png", buffer: art })
  await expect(page.getByRole("img", { name: "Prévia da arte" })).toBeVisible()
  await page.getByLabel("Título").fill(`${TAG} Indique e ganhe`)
  await page.getByRole("button", { name: "Criar campanha" }).click()
  await expect(page.getByText(/Campanha criada/)).toBeVisible()
  await expect(page.getByRole("listitem").filter({ hasText: `${TAG} Indique e ganhe` })).toContainText("No ar")

  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" })
  const personal = await ctx.newPage()
  await login(personal, USERS.personal)
  await personal.goto("/agora")
  await expect(personal.getByRole("region", { name: "Campanhas" }).getByRole("img", { name: `${TAG} Indique e ganhe` })).toBeVisible()
  await ctx.close()
})

test("meu mês: o professor vê só o próprio total, sem alunos nem valores de mensalidade", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await login(page, USERS.personal)
  await page.getByRole("navigation").getByRole("link", { name: "Meu mês" }).first().click()
  await expect(page.getByRole("heading", { name: "Seu repasse" })).toBeVisible()
  await expect(page.getByText(/de bônus por aluno que você trouxe/)).toBeVisible()
  await expect(page.getByRole("heading", { name: "Professor do mês" })).toBeVisible()
  const text = await page.locator("main").innerText()
  expect(text).not.toMatch(/Bruna Teixeira|Pago pelos alunos|Parte do estúdio|Comissão \d/i)
  // Repasses do admin continuam fechados para o personal.
  await page.goto("/financeiro/repasses")
  await expect(page).not.toHaveURL(/\/financeiro\/repasses/)
})

test("pré-cadastro guarda quem trouxe o aluno", async ({ page }) => {
  await login(page, USERS.admin)
  await page.goto("/alunos/novo")
  await page.getByLabel("Nome completo").fill(`${TAG} Indicado Silva`)
  await page.getByLabel("WhatsApp").fill("15990001234")
  await page.getByRole("group", { name: "Quem trouxe o aluno?" }).getByRole("button", { name: "Ana" }).click()
  await page.getByRole("button", { name: "Criar e gerar link" }).click()
  await expect(page.getByText("Link pronto")).toBeVisible()
  const { data } = await service().from("students").select("referred_by").eq("full_name", `${TAG} Indicado Silva`).single()
  expect(data!.referred_by).toBe(await personalId("ana@ritmus.test"))

  await page.getByRole("link", { name: "Ver ficha" }).click()
  await expect(page.getByText("Trazido por Ana")).toBeVisible()
})
