import { expect, test } from "@playwright/test"

import { login, service, USERS } from "./support"

const TAG = `e2e${Date.now().toString(36)}`

async function createWaitingStudent(name: string, parqYes: boolean) {
  const db = service()
  const { data: s, error } = await db
    .from("students")
    .insert({ full_name: name, whatsapp: "15995554444", status: "aguardando", submitted_at: new Date().toISOString(), weekly_frequency: 2 })
    .select("id")
    .single()
  if (error) throw error
  await db.from("student_health").insert({ student_id: s.id, parq_answers: [parqYes, false, false, false, false, false, false] })
  await db.from("student_billing").insert({ student_id: s.id, due_day: 15 })
  return s.id as string
}

test.afterAll(async () => {
  const db = service()
  await db.from("students").delete().like("full_name", `%${TAG}%`)
  const { data } = await db.auth.admin.listUsers({ perPage: 200 })
  for (const u of data?.users ?? []) if (u.email?.includes(TAG)) await db.auth.admin.deleteUser(u.id)
})

test("liberação médica com Desfazer, depois ativação com horário e valor", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const name = `Joana Liberação ${TAG}`
  const id = await createWaitingStudent(name, true)
  const db = service()

  await login(page, USERS.admin)
  const card = page.getByRole("article").filter({ hasText: name })
  await expect(card).toContainText("Precisa da liberação médica")

  // Registrar → some; Desfazer → volta
  await card.getByRole("button", { name: "Registrar liberação" }).click()
  await page.getByRole("button", { name: "Registrar liberação" }).last().click()
  await expect(card).toHaveCount(0)
  await page.getByRole("button", { name: "Desfazer" }).click()
  await expect(page.getByRole("article").filter({ hasText: name })).toContainText("Precisa da liberação médica")

  // Registrar de novo → vira tarefa de cadastro
  await page.getByRole("article").filter({ hasText: name }).getByRole("button", { name: "Registrar liberação" }).click()
  await page.getByRole("button", { name: "Registrar liberação" }).last().click()
  await expect(page.getByText(/Liberação de Joana registrada/).last()).toBeVisible()
  await page.reload()
  const cadastro = page.getByRole("article").filter({ hasText: name })
  await expect(cadastro).toContainText("Falta ativar")

  // Ativar: personal, frequência, um horário com vaga e o valor de referência
  await cadastro.getByRole("button", { name: "Ativar" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByRole("button", { name: "Bruno" }).click()
  await sheet.getByRole("button", { name: "2x", exact: true }).click()
  await sheet.locator('button[aria-pressed="false"][aria-label*="vagas"]:not([disabled])').first().click()
  await sheet.getByRole("button", { name: /Usar referência de 2x/ }).click()
  await sheet.getByRole("button", { name: "Ativar aluno" }).click()
  await expect(page.getByText(/está ativo/)).toBeVisible()
  await expect(page.getByRole("article").filter({ hasText: name })).toHaveCount(0)

  const { data } = await db.from("students").select("status, personal_id, enrollments(id), student_billing(monthly_fee_cents, due_day)").eq("id", id).single()
  expect(data).toMatchObject({ status: "ativo", student_billing: { monthly_fee_cents: 28000, due_day: 15 } })
  expect(data!.enrollments).toHaveLength(1)
})

test("pré-cadastro gera o link e o botão do WhatsApp com a mensagem pronta", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await login(page, USERS.admin)
  await page.goto("/alunos")
  await page.getByRole("link", { name: "Novo aluno" }).last().click()
  await page.getByRole("button", { name: "Criar e gerar link" }).click()
  await expect(page.getByText("Digite o nome do aluno.")).toBeVisible()
  await page.getByLabel("Nome completo").fill(`Renata Convite ${TAG}`)
  await page.getByLabel("WhatsApp").fill("15994443333")
  await page.getByRole("button", { name: "Criar e gerar link" }).click()
  await expect(page.getByText("Link pronto")).toBeVisible()
  const href = await page.getByRole("link", { name: "Enviar no WhatsApp" }).getAttribute("href")
  expect(href).toContain("https://wa.me/5515994443333?text=")
  expect(decodeURIComponent(href!)).toMatch(/Oi, Renata![\s\S]*\/cadastro\//)
})

test("Equipe: cria personal, mostra a senha temporária e obriga a trocar no primeiro acesso", async ({ page }) => {
  const email = `carla.${TAG}@ritmus.test`
  await login(page, USERS.admin)
  await page.goto("/equipe")
  await page.getByRole("button", { name: "Novo personal" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByLabel("Nome completo").fill("Carla Mendes")
  await sheet.getByLabel("E-mail (é o login)").fill(email)
  await sheet.getByLabel("WhatsApp").fill("15993332222")
  const password = await sheet.getByLabel("Senha temporária").inputValue()
  await sheet.getByRole("button", { name: "Criar conta" }).click()
  await expect(page.getByRole("dialog")).toContainText("Conta criada")
  await expect(page.getByRole("dialog")).toContainText(password)
  await page.getByRole("button", { name: "Fechar" }).first().click()
  await expect(page.getByText("Ainda não criou a senha")).toBeVisible()

  await page.context().clearCookies()
  await login(page, email, password)
  await expect(page).toHaveURL(/\/primeiro-acesso$/)
})

test("personal edita os dados do próprio aluno, mas não vê mensalidade nem ações de admin", async ({ page }) => {
  const db = service()
  const { data: ana } = await db.from("profiles").select("id").eq("email", USERS.personal).single()
  const { data: s } = await db
    .from("students")
    .insert({ full_name: `Otávio Edição ${TAG}`, whatsapp: "15992221111", status: "ativo", personal_id: ana!.id, height_cm: 170 })
    .select("id")
    .single()
  await db.from("student_billing").insert({ student_id: s!.id, monthly_fee_cents: 99900, due_day: 5 })

  await login(page, USERS.personal)
  await page.goto(`/alunos/${s!.id}`)
  await expect(page.getByRole("heading", { name: /Otávio/ })).toBeVisible()
  await expect(page.getByText("Mensalidade")).toHaveCount(0)
  await expect(page.getByText(/999/)).toHaveCount(0)
  await expect(page.getByRole("button", { name: /Pausar|Inativar|Ativar/ })).toHaveCount(0)

  await page.getByRole("link", { name: "Editar dados" }).click()
  await page.getByLabel("Altura").fill("1,72")
  await page.getByRole("button", { name: "Salvar alterações" }).click()
  await expect(page).toHaveURL(new RegExp(`/alunos/${s!.id}$`))
  await expect(page.getByText("1,72 m")).toBeVisible()
})

test("painel de ativação rola no celular até o botão e os campos de baixo", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await login(page, USERS.admin)
  await page.getByRole("article").filter({ hasText: "Tatiane" }).getByRole("button", { name: "Ativar" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByRole("button", { name: "Gabriel" }).click()
  const body = sheet.locator("form > div").first()
  const scrollable = await body.evaluate((el) => el.scrollHeight > el.clientHeight)
  expect(scrollable).toBe(true)
  await body.hover()
  await page.mouse.wheel(0, 2000)
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(100)
  await expect(sheet.getByLabel("Dia do vencimento")).toBeInViewport()
  await expect(sheet.getByRole("button", { name: "Ativar aluno" })).toBeInViewport()
})

test("foto do personal: admin envia na Equipe e ela aparece no card", async ({ page }) => {
  const sharp = (await import("sharp")).default
  const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 240, g: 91, b: 42 } } }).png().toBuffer()
  const db = service()
  const { data: bruno } = await db.from("profiles").select("id").eq("email", "bruno@ritmus.test").single()
  try {
    await login(page, USERS.admin)
    await page.goto("/equipe")
    const card = page.getByRole("listitem").filter({ hasText: "bruno@ritmus.test" })
    await card.locator('input[type="file"]').setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: png })
    await expect(page.getByText("Foto atualizada.")).toBeVisible()
    await expect(card.locator("img")).toHaveAttribute("src", new RegExp(`/avatars/${bruno!.id}/`))
  } finally {
    await db.from("profiles").update({ avatar_url: null }).eq("id", bruno!.id)
  }
})
