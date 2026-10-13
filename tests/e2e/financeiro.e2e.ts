import { expect, test } from "@playwright/test"

import { login, service, USERS } from "./support"

test("tarefa de atraso: cobrar no WhatsApp com mensagem e Pix, confirmar pagamento com Desfazer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await login(page, USERS.admin)
  const card = page.getByRole("article").filter({ hasText: "Lucas Santos" })
  await expect(card).toContainText("Venceu em")

  const href = await card.getByRole("link", { name: "Cobrar no WhatsApp" }).getAttribute("href")
  const text = decodeURIComponent(href!.split("?text=")[1]!)
  expect(href).toMatch(/^https:\/\/wa\.me\/55\d{10,11}\?text=/)
  expect(text).toMatch(/Oi, Lucas!/)
  expect(text).toMatch(/ainda está em aberto/) // mensagem de atraso
  expect(text).toMatch(/R\$\s?\d/)
  expect(text).toMatch(/000201.*br\.gov\.bcb\.pix.*6304[0-9A-F]{4}/) // Pix copia e cola

  await card.getByRole("button", { name: "Confirmar pagamento" }).click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByRole("button", { name: "Pix" })).toHaveAttribute("aria-pressed", "true")
  await sheet.getByRole("button", { name: "Dinheiro" }).click()
  await sheet.getByRole("button", { name: /^Confirmar R\$/ }).click()
  await expect(page.getByText(/Pagamento de Lucas confirmado/)).toBeVisible()
  await expect(page.getByRole("article").filter({ hasText: "Lucas Santos" })).toHaveCount(0)

  const db = service()
  const { data: paid } = await db.from("charges_view").select("status, payment_method").eq("full_name", "Lucas Santos").eq("status", "pago").order("competence", { ascending: false }).limit(1).single()
  expect(paid).toMatchObject({ status: "pago", payment_method: "dinheiro" })

  await page.getByRole("listitem").filter({ hasText: "Pagamento de Lucas" }).getByRole("button", { name: "Desfazer" }).click()
  await expect(page.getByRole("article").filter({ hasText: "Lucas Santos" })).toBeVisible()
})

test("financeiro do mês, detalhe com Pix/QR, ajuste registrado no histórico", async ({ page }) => {
  await login(page, USERS.admin)
  await page.goto("/financeiro")
  await expect(page.getByText("Previsto")).toBeVisible()
  await page.getByRole("navigation", { name: "Filtrar mensalidades" }).getByRole("link", { name: /Em atraso/ }).click()
  const item = page.getByRole("listitem").filter({ hasText: "Lucas Santos" })
  await item.getByRole("link").first().click()
  await expect(page.getByRole("img", { name: "QR Code do Pix desta mensalidade" })).toBeVisible()
  await expect(page.getByText(/^000201/)).toBeVisible()

  const before = (await page.locator("p.font-display").first().textContent())!
  await page.getByRole("button", { name: "Ajustar valor ou vencimento" }).click()
  await page.getByRole("dialog").getByLabel("Valor").fill("12345")
  await page.getByRole("dialog").getByRole("button", { name: "Salvar ajuste" }).click()
  await expect(page.getByText("R$ 123,45").first()).toBeVisible()
  await expect(page.getByText("Valor ajustado")).toBeVisible()

  // Volta ao valor original
  await page.getByRole("button", { name: "Ajustar valor ou vencimento" }).click()
  await page.getByRole("dialog").getByLabel("Valor").fill(before.replace(/\D/g, ""))
  await page.getByRole("dialog").getByRole("button", { name: "Salvar ajuste" }).click()
  await expect(page.getByText(before).first()).toBeVisible()
})

test("relatórios: recebido × previsto e inadimplentes", async ({ page }) => {
  await login(page, USERS.admin)
  await page.goto("/financeiro/relatorios")
  await expect(page.getByRole("meter").first()).toBeVisible()
  await expect(page.getByRole("heading", { name: "Inadimplentes" })).toBeVisible()
  await expect(page.getByText("Thiago Rodrigues")).toBeVisible()
  await expect(page.getByText("Bianca Pereira")).toBeVisible()
})

test("configurar Pix por celular gera chave válida", async ({ page }) => {
  await login(page, USERS.admin)
  await page.goto("/configuracoes#pix")
  await page.getByRole("button", { name: "Celular" }).click()
  await page.getByLabel("Chave Pix").fill("15991110001")
  await expect(page.getByLabel("Chave Pix")).toHaveValue("(15) 99111-0001")
  await expect(page.getByText(/Chave válida/)).toBeVisible()
  await page.getByRole("button", { name: "Salvar Pix" }).click()
  await expect(page.getByText(/Pix salvo/)).toBeVisible()
  const { data } = await service().from("studio_settings").select("pix_key, pix_key_type").single()
  expect(data).toEqual({ pix_key: "+5515991110001", pix_key_type: "telefone" })
  // volta ao padrão do seed
  await service().from("studio_settings").update({ pix_key: "pix@ritmus.test", pix_key_type: "email" }).eq("id", true)
})
