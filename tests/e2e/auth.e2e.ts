import { expect, test } from "@playwright/test"

import { login, PASSWORD, service, USERS } from "./support"

test("senha errada mostra o erro e mantém o e-mail digitado", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("E-mail").fill(USERS.personal)
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByRole("alert").first()).toContainText("E-mail ou senha incorretos")
  await expect(page.getByLabel("E-mail")).toHaveValue(USERS.personal)
})

test("sem login, qualquer tela manda para o login e volta depois", async ({ page }) => {
  await page.goto("/alunos")
  await expect(page).toHaveURL(/\/login\?voltar=%2Falunos/)
  await page.getByLabel("E-mail").fill(USERS.personal)
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/alunos$/)
})

test("cada perfil abre na sua tela inicial e o personal não entra no financeiro", async ({ page }) => {
  await login(page, USERS.personal)
  await expect(page).toHaveURL(/\/agora$/)
  await expect(page.getByRole("link", { name: "Financeiro" })).toHaveCount(0)
  await page.goto("/financeiro")
  await expect(page).toHaveURL(/\/agora$/)

  await page.context().clearCookies()
  await login(page, USERS.admin)
  await expect(page).toHaveURL(/\/tarefas$/)
})

test("conta nova é obrigada a trocar a senha temporária", async ({ page }) => {
  const db = service()
  const email = `temp-${Date.now()}@ritmus.test`
  const { data } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  await db.from("profiles").insert({ id: data.user!.id, email, full_name: "Teste Temporário", role: "personal" })
  try {
    await login(page, email)
    await expect(page).toHaveURL(/\/primeiro-acesso$/)
    await page.goto("/alunos")
    await expect(page).toHaveURL(/\/primeiro-acesso$/)

    await page.getByLabel("Nova senha", { exact: true }).fill("nova-senha-forte-1")
    await page.getByLabel("Repita a nova senha").fill("nova-senha-forte-1")
    await page.getByRole("button", { name: "Salvar e entrar" }).click()
    await expect(page).toHaveURL(/\/agora/)
  } finally {
    await db.auth.admin.deleteUser(data.user!.id)
  }
})

test("sessão de conta que não existe mais é limpa e volta para o login", async ({ page, context }) => {
  const db = service()
  const email = `sumiu-${Date.now()}@ritmus.test`
  const { data } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  await db.from("profiles").insert({ id: data.user!.id, email, full_name: "Conta Removida", role: "personal", must_change_password: false })
  await login(page, email)
  // Expira o token de acesso para forçar a renovação, e remove a conta (como num reset do banco).
  const cookies = await context.cookies()
  await db.auth.admin.deleteUser(data.user!.id)
  await context.clearCookies()
  await context.addCookies(
    cookies.map((c) => {
      if (!c.name.includes("auth-token")) return c
      const raw = decodeURIComponent(c.value).replace(/^base64-/, "")
      const session = JSON.parse(Buffer.from(raw, "base64").toString("utf8"))
      session.expires_at = Math.floor(Date.now() / 1000) - 60
      return { ...c, value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}` }
    }),
  )
  await page.goto("/alunos")
  await expect(page).toHaveURL(/\/login/)
  const left = (await context.cookies()).filter((c) => c.name.includes("auth-token"))
  expect(left).toHaveLength(0)
})
