/**
 * Prints de revisão (não são testes de regressão). Saída: prints/<fase>/<tela>-<largura>[-escuro].png
 * Fase em PRINTS_PHASE (padrão: atual). Requer seed: npm run db:reset
 */
import { test, type Page } from "@playwright/test"

import { generateToken, hashToken } from "../../src/lib/tokens"
import { login, PASSWORD, service, USERS, VIEWPORTS } from "./support"

const PHASE = process.env.PRINTS_PHASE ?? "fase-4"
const TAG = `print${Date.now().toString(36)}`

async function shoot(page: Page, name: string, opts: { dark?: boolean; full?: boolean } = {}) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.waitForTimeout(700) // gráficos se redimensionam depois do resize
    await page.screenshot({ path: `prints/${PHASE}/${name}-${vp.name}${opts.dark ? "-escuro" : ""}.png`, fullPage: opts.full ?? true })
  }
}

async function one(page: Page, name: string, width = 375, height = 812) {
  await page.setViewportSize({ width, height })
  await page.waitForTimeout(350)
  await page.screenshot({ path: `prints/${PHASE}/${name}.png` })
}

const studentId = async (name: string) => {
  const { data } = await service().from("students").select("id").eq("full_name", name).single()
  return data!.id as string
}

test.describe.configure({ mode: "serial" })

test.afterAll(async () => {
  const db = service()
  await db.from("students").delete().like("full_name", `%${TAG}%`)
  const { data } = await db.auth.admin.listUsers({ perPage: 200 })
  for (const u of data?.users ?? []) if (u.email?.includes(TAG)) await db.auth.admin.deleteUser(u.id)
})

test("login e primeiro acesso", async ({ page }) => {
  await page.goto("/login")
  await shoot(page, "login")
  const db = service()
  const email = `novo.${TAG}@ritmus.test`
  const { data } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  await db.from("profiles").insert({ id: data.user!.id, email, full_name: "Carla Mendes", role: "personal" })
  await login(page, email)
  await page.waitForURL("**/primeiro-acesso")
  await shoot(page, "primeiro-acesso")
})

test("formulário público de cadastro", async ({ page }) => {
  const db = service()
  const { data: s } = await db.from("students").insert({ full_name: `Paula Souza ${TAG}`, whatsapp: "15998887777", status: "convidado" }).select("id").single()
  const token = generateToken()
  await db.from("student_invites").insert({ student_id: s!.id, token_hash: hashToken(token) })
  await page.route("https://viacep.com.br/ws/**", (r) =>
    r.fulfill({ json: { logradouro: "Rua Sete de Setembro", bairro: "Centro", localidade: "Pilar do Sul", uf: "SP" } }),
  )

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/cadastro/${token}`, { waitUntil: "networkidle" })
  await shoot(page, "cadastro-1-dados", { full: false })
  await page.getByRole("button", { name: /Continuar/ }).click()
  await one(page, "cadastro-1-erros")
  await page.getByLabel("CPF").fill("52998224725")
  await page.getByLabel("Data de nascimento").fill("25041990")
  await page.getByRole("button", { name: /Continuar/ }).click()
  await page.getByLabel("CEP").fill("18185000")
  await page.getByLabel("Número").fill("120")
  await one(page, "cadastro-2-endereco")
  await page.getByRole("button", { name: /Continuar/ }).click()
  await page.getByLabel("Nome").fill("Marcos Souza")
  await page.getByLabel("Telefone").fill("15997776666")
  await page.getByLabel("Quem é").fill("Irmão")
  await page.getByRole("button", { name: /Continuar/ }).click()
  await page.getByRole("button", { name: "Emagrecer" }).click()
  await page.getByRole("button", { name: "Condicionamento" }).click()
  await page.getByLabel("Altura").fill("1,68")
  await page.getByLabel("Peso").fill("70,5")
  await one(page, "cadastro-4-objetivos")
  await page.getByRole("button", { name: /Continuar/ }).click()
  await page.getByRole("button", { name: "Dia 10" }).click()
  await one(page, "cadastro-5-mensalidade")
  await page.getByRole("button", { name: /Continuar/ }).click()
  const groups = page.getByRole("radiogroup")
  for (let i = 0; i < 7; i++) await groups.nth(i).getByRole("radio", { name: i === 4 ? "Sim" : "Não" }).click()
  await shoot(page, "cadastro-6-saude")
  await page.getByText("Li e concordo com a declaração acima.").click()
  await page.getByRole("button", { name: /Continuar/ }).click()
  await shoot(page, "cadastro-7-termos", { full: false })
  await page.getByText("Li e aceito os termos de uso.").click()
  await page.getByText("Autorizo o uso dos meus dados").click()
  await page.getByRole("button", { name: "Enviar cadastro" }).click()
  await page.getByRole("heading", { name: "Cadastro enviado!" }).waitFor()
  await shoot(page, "cadastro-enviado")
  await page.goto(`/cadastro/${"x".repeat(43)}`)
  await one(page, "cadastro-link-invalido")
})

test("admin", async ({ page }) => {
  await login(page, USERS.admin)
  await page.waitForURL("**/tarefas")
  await shoot(page, "admin-tarefas")

  // Painéis de ação da Central de tarefas
  await page.setViewportSize({ width: 375, height: 812 })
  const paula = page.getByRole("article").filter({ hasText: "Paula Souza" })
  await paula.getByRole("button", { name: "Registrar liberação" }).click()
  await one(page, "admin-tarefa-liberacao")
  await page.keyboard.press("Escape")
  await page.getByRole("article").filter({ hasText: "Tatiane" }).getByRole("button", { name: "Ativar" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByRole("button", { name: "Ana" }).click()
  await sheet.getByRole("button", { name: "2x", exact: true }).click()
  await one(page, "admin-tarefa-ativar")
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `prints/${PHASE}/admin-tarefa-ativar-1024.png` })
  await page.keyboard.press("Escape")
  await page.getByRole("article").filter({ hasText: "Marcelo" }).first().getByRole("button", { name: "Definir valor" }).click()
  await one(page, "admin-tarefa-valor")
  await page.keyboard.press("Escape")

  await page.goto("/alunos")
  await shoot(page, "admin-alunos")
  await page.goto(`/alunos/${await studentId("Diego Carvalho")}`)
  await shoot(page, "admin-aluno-ficha")
  await page.goto(`/alunos/${await studentId("Leandro Martins")}`)
  await shoot(page, "admin-aluno-aguardando")
  await page.goto(`/alunos/${await studentId("Carolina Dias")}`)
  await shoot(page, "admin-aluno-convidado")
  await page.goto(`/alunos/${await studentId("Diego Carvalho")}/editar`)
  await shoot(page, "admin-aluno-editar", { full: false })

  await page.goto("/alunos/novo")
  await shoot(page, "admin-novo-aluno")
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByLabel("Nome completo").fill(`Renata Lima ${TAG}`)
  await page.getByLabel("WhatsApp").fill("15994443333")
  await page.getByRole("button", { name: "Criar e gerar link" }).click()
  await page.getByText("Link pronto").waitFor()
  await one(page, "admin-novo-aluno-link")

  await page.goto("/equipe")
  await shoot(page, "admin-equipe")
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole("button", { name: "Novo personal" }).click()
  await one(page, "admin-equipe-novo")
  await page.keyboard.press("Escape")

  await page.goto("/configuracoes")
  await shoot(page, "admin-configuracoes")

  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/tarefas")
  await shoot(page, "admin-tarefas", { dark: true })
  await page.goto(`/alunos/${await studentId("Diego Carvalho")}`)
  await shoot(page, "admin-aluno-ficha", { dark: true })
  await page.emulateMedia({ colorScheme: "light" })
})

test("personal", async ({ page }) => {
  await login(page, USERS.personal)
  await page.waitForURL("**/agora")
  await page.goto("/alunos")
  await shoot(page, "personal-alunos")
  await page.goto(`/alunos/${await studentId("Diego Carvalho")}`)
  await shoot(page, "personal-aluno-ficha")
})

test("agenda", async ({ page }) => {
  const db = service()
  const d = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) + "T12:00:00Z")
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1)
  const date = d.toISOString().slice(0, 10)
  const { data: ana } = await db.from("profiles").select("id").eq("email", USERS.personal).single()
  const { data: session } = await db
    .from("class_sessions")
    .select("id")
    .eq("personal_id", ana!.id)
    .eq("date", date)
    .eq("start_time", "09:00:00")
    .single()

  await login(page, USERS.personal)
  await shoot(page, "personal-agora")
  await page.goto(`/agenda?data=${date}`)
  await shoot(page, "personal-agenda")
  await page.goto(`/agenda/aula/${session!.id}`)
  await shoot(page, "personal-aula")
  await page.setViewportSize({ width: 375, height: 812 })
  const list = page.getByRole("list", { name: "Alunos do horário" })
  await list.getByRole("listitem").first().getByRole("button", { name: /Mais opções/ }).click()
  await one(page, "personal-aula-opcoes-aluno")
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: /Adicionar reposição|Horário lotado/ }).click()
  await page.waitForTimeout(500)
  await one(page, "personal-aula-reposicao")
  await page.keyboard.press("Escape")

  await page.context().clearCookies()
  await login(page, USERS.admin)
  await page.goto(`/agenda?data=${date}`)
  await shoot(page, "admin-agenda")
  await page.goto(`/agenda?data=${date}&visao=semana`)
  await shoot(page, "admin-agenda-semana")
  await page.goto("/configuracoes/horarios")
  await shoot(page, "admin-horarios")
  await page.goto(`/alunos/${await studentId("Mariana Oliveira")}`)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole("button", { name: "Mudar horários" }).click()
  await one(page, "admin-aluno-mudar-horarios")
})

test("evolução", async ({ page, context }) => {
  const db = service()
  const d = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) + "T12:00:00Z")
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1)
  const { data: ana } = await db.from("profiles").select("id").eq("email", USERS.personal).single()
  const { data: session } = await db
    .from("class_sessions")
    .select("id")
    .eq("personal_id", ana!.id)
    .eq("date", d.toISOString().slice(0, 10))
    .eq("start_time", "09:00:00")
    .single()

  await login(page, USERS.personal)
  await page.goto(`/agenda/aula/${session!.id}`)
  await shoot(page, "personal-aula")
  await page.setViewportSize({ width: 375, height: 812 })
  const row = page.getByRole("list", { name: "Alunos do horário" }).getByRole("listitem").first()
  await row.getByRole("button", { name: /Registrar medição/ }).click()
  await page.getByRole("dialog").getByLabel("Peso").fill("71,4")
  await page.waitForTimeout(400)
  await one(page, "personal-medicao")
  await page.keyboard.press("Escape")

  // Sem internet: medição pendente
  await context.setOffline(true)
  await row.getByRole("button", { name: /Registrar medição/ }).click()
  await page.getByRole("dialog").getByLabel("Peso").fill("71,3")
  await page.getByRole("dialog").getByRole("button", { name: "Salvar medição" }).click()
  await page.getByText(/Sem internet/).waitFor()
  await one(page, "personal-medicao-pendente")
  await page.getByRole("button", { name: /pendente/ }).click()
  await one(page, "personal-medicao-pendente-lista")
  await page.keyboard.press("Escape")
  await context.setOffline(false)
  await page.getByText("Medição pendente enviada.").waitFor({ timeout: 15000 })
  await db.from("measurements").delete().eq("weight_kg", 71.3).gte("created_at", new Date(Date.now() - 300_000).toISOString())

  const diego = await studentId("Diego Carvalho")
  await page.goto(`/alunos/${diego}?aba=evolucao`)
  await shoot(page, "personal-evolucao")
  await page.goto(`/alunos/${diego}?aba=presenca`)
  await shoot(page, "personal-presenca")
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto(`/alunos/${diego}?aba=evolucao`)
  await shoot(page, "personal-evolucao", { dark: true })
  await page.emulateMedia({ colorScheme: "light" })
})
