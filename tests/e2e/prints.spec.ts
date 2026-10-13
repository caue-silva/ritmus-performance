/**
 * Prints de revisão (não são testes de regressão). Saída: prints/<fase>/<tela>-<largura>[-escuro].png
 * Fase atual em PRINTS_PHASE (padrão: fase-1).
 */
import { test, type Page } from "@playwright/test"

import { login, PASSWORD, service, USERS, VIEWPORTS } from "./support"

const PHASE = process.env.PRINTS_PHASE ?? "fase-1"

async function shoot(page: Page, name: string, opts: { dark?: boolean } = {}) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.waitForTimeout(250)
    await page.screenshot({
      path: `prints/${PHASE}/${name}-${vp.name}${opts.dark ? "-escuro" : ""}.png`,
      fullPage: true,
    })
  }
}

test.describe.configure({ mode: "serial" })

test("login e primeiro acesso", async ({ page }) => {
  await page.goto("/login")
  await shoot(page, "login")

  await page.getByRole("button", { name: "Entrar" }).click()
  await page.getByText("Digite um e-mail válido.").waitFor()
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({ path: `prints/${PHASE}/login-erro-375.png`, fullPage: true })

  // Conta nova com senha temporária → troca obrigatória.
  const db = service()
  const email = `novo-${Date.now()}@ritmus.test`
  const { data } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  await db.from("profiles").insert({ id: data.user!.id, email, full_name: "Carla Mendes", role: "personal" })
  try {
    await login(page, email)
    await page.waitForURL("**/primeiro-acesso")
    await shoot(page, "primeiro-acesso")
  } finally {
    await db.auth.admin.deleteUser(data.user!.id)
  }
})

test("admin", async ({ page }) => {
  await login(page, USERS.admin)
  await page.waitForURL("**/tarefas")
  await shoot(page, "admin-tarefas")

  await page.goto("/alunos")
  await shoot(page, "admin-alunos")
  await page.getByRole("link", { name: /Mariana/ }).click()
  await page.waitForURL("**/alunos/*")
  await shoot(page, "admin-aluno")

  await page.goto("/mais")
  await shoot(page, "admin-mais")
  await page.goto("/financeiro")
  await shoot(page, "admin-financeiro")

  // Busca aberta (celular e computador).
  await page.goto("/tarefas")
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole("button", { name: "Buscar aluno" }).click()
  await page.getByPlaceholder("Nome ou telefone do aluno").fill("patri")
  await page.getByText("Patrícia").first().waitFor()
  await page.screenshot({ path: `prints/${PHASE}/busca-375.png` })
  await page.keyboard.press("Escape")
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.keyboard.press("/")
  await page.getByPlaceholder("Nome ou telefone do aluno").fill("lu")
  await page.waitForTimeout(600)
  await page.screenshot({ path: `prints/${PHASE}/busca-1024.png` })
  await page.keyboard.press("Escape")

  await page.goto("/conta")
  await shoot(page, "admin-conta")

  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/alunos")
  await shoot(page, "admin-alunos", { dark: true })
  await page.goto("/tarefas")
  await shoot(page, "admin-tarefas", { dark: true })
  await page.emulateMedia({ colorScheme: "light" })
})

test("personal", async ({ page }) => {
  await login(page, USERS.personal)
  await page.waitForURL("**/agora")
  await shoot(page, "personal-agora")
  await page.goto("/alunos")
  await shoot(page, "personal-alunos")
  await page.goto("/conta")
  await shoot(page, "personal-conta")
  // Tentar abrir o financeiro manda de volta para "Agora".
  await page.goto("/financeiro")
  await page.waitForURL("**/agora")
})
