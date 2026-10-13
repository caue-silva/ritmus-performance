import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { login, service, USERS } from "./support"

/** Falha em violações sérias ou críticas do WCAG 2.1 AA. */
async function audit(page: Page, label: string) {
  await page.waitForLoadState("networkidle")
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
  const report = serious.map((v) => `${label} → ${v.id}: ${v.help}\n   ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n   ")}`)
  expect(report, report.join("\n")).toEqual([])
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`acessibilidade (${scheme === "light" ? "claro" : "escuro"})`, () => {
    test.use({ colorScheme: scheme, viewport: { width: 375, height: 812 } })

    test("telas públicas", async ({ page }) => {
      await page.goto("/login")
      await audit(page, "login")
    })

    test("admin", async ({ page }) => {
      const db = service()
      const { data: s } = await db.from("students").select("id").eq("full_name", "Diego Carvalho").single()
      const { data: c } = await db.from("charges_view").select("id").eq("full_name", "Lucas Santos").eq("effective_status", "vencido").limit(1).single()
      await login(page, USERS.admin)
      for (const path of [
        "/tarefas",
        "/alunos",
        `/alunos/${s!.id}`,
        `/alunos/${s!.id}?aba=evolucao`,
        `/alunos/${s!.id}?aba=presenca`,
        "/agenda",
        "/financeiro",
        `/financeiro/${c!.id}`,
        "/financeiro/relatorios",
        "/financeiro/repasses",
        "/painel",
        "/campanhas",
        "/campanhas/nova",
        "/equipe",
        "/configuracoes",
        "/configuracoes/horarios",
        "/conta",
      ]) {
        await page.goto(path)
        await audit(page, path)
      }
    })

    test("personal", async ({ page }) => {
      await login(page, USERS.personal)
      for (const path of ["/agora", "/agenda", "/alunos", "/meu-mes"]) {
        await page.goto(path)
        await audit(page, path)
      }
    })
  })
}
