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
