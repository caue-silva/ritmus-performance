import { expect, test, type Page } from "@playwright/test"

import { service } from "./support"
import { generateToken, hashToken } from "../../src/lib/tokens"

async function createInvite(name: string, whatsapp: string) {
  const db = service()
  const { data: student, error } = await db
    .from("students")
    .insert({ full_name: name, whatsapp, status: "convidado" })
    .select("id")
    .single()
  if (error) throw error
  const token = generateToken()
  await db.from("student_invites").insert({ student_id: student.id, token_hash: hashToken(token) })
  return { studentId: student.id as string, token }
}

const mockViaCep = (page: Page) =>
  page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({
      json: { cep: "18185-000", logradouro: "Rua Teste", bairro: "Centro", localidade: "Pilar do Sul", uf: "SP" },
    }),
  )

test("aluno preenche o cadastro em etapas, com rascunho salvo, e envia", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await mockViaCep(page)
  const { studentId, token } = await createInvite("Paula Teste Cadastro", "15998887777")
  const db = service()

  try {
    await page.goto(`/cadastro/${token}`, { waitUntil: "networkidle" })
    await expect(page.getByLabel("WhatsApp")).toHaveValue("(15) 99888-7777")

    // Etapa 1 — validação no campo
    await page.getByRole("button", { name: /Continuar/ }).click()
    await expect(page.getByText("Digite seu CPF.")).toBeVisible()
    await page.getByLabel("CPF").fill("52998224725")
    await expect(page.getByLabel("CPF")).toHaveValue("529.982.247-25")
    await page.getByLabel("Data de nascimento").fill("25041990")
    await page.getByRole("button", { name: /Continuar/ }).click()

    // Etapa 2 — CEP completa o endereço
    await expect(page.getByRole("heading", { name: "Endereço" })).toBeVisible()
    await page.getByLabel("CEP").fill("18185000")
    await expect(page.getByLabel("Rua")).toHaveValue("Rua Teste")
    await page.getByLabel("Número").fill("123")
    await page.getByRole("button", { name: /Continuar/ }).click()

    // Rascunho: recarregar volta na mesma etapa, com os dados
    await expect(page.getByText("Salvo")).toBeVisible()
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { name: "Contato de emergência" })).toBeVisible()
    await page.getByRole("button", { name: "Voltar" }).click()
    await expect(page.getByLabel("Rua")).toHaveValue("Rua Teste")
    await page.getByRole("button", { name: /Continuar/ }).click()

    // Etapa 3
    await page.getByLabel("Nome").fill("Marcos Teste")
    await page.getByLabel("Telefone").fill("15997776666")
    await page.getByLabel("Quem é").fill("Irmão")
    await page.getByRole("button", { name: /Continuar/ }).click()

    // Etapa 4
    await page.getByRole("button", { name: "Emagrecer" }).click()
    await page.getByLabel("Altura").fill("1,68")
    await page.getByLabel("Peso").fill("70,5")
    await page.getByRole("button", { name: /Continuar/ }).click()

    // Etapa 5
    await page.getByRole("button", { name: "Dia 10" }).click()
    await page.getByRole("button", { name: /Continuar/ }).click()

    // Etapa 6 — PAR-Q com um "sim"
    const groups = page.getByRole("radiogroup")
    for (let i = 0; i < 7; i++) {
      await groups.nth(i).getByRole("radio", { name: i === 4 ? "Sim" : "Não" }).click()
    }
    await page.getByLabel(/Tem algo que o seu personal/).fill("Dor no ombro esquerdo")
    await page.getByRole("button", { name: /Continuar/ }).click()
    await expect(page.getByText("Para continuar, marque a declaração.")).toBeVisible()
    await page.getByText("Li e concordo com a declaração acima.").click()
    await page.getByRole("button", { name: /Continuar/ }).click()

    // Etapa 7 — termos
    await page.getByText("Li e aceito os termos de uso.").click()
    await page.getByText("Autorizo o uso dos meus dados").click()
    await page.getByRole("button", { name: "Enviar cadastro" }).click()
    await expect(page.getByRole("heading", { name: "Cadastro enviado!" })).toBeVisible()

    // Banco: aguardando ativação, PAR-Q com sim, consentimentos com versão, medição inicial
    const { data: s } = await db
      .from("students")
      .select("status, cpf, birth_date, height_cm, student_health(requires_clearance, health_notes), student_billing(due_day), consents(id), measurements(weight_kg, source)")
      .eq("id", studentId)
      .single()
    expect(s).toMatchObject({ status: "aguardando", cpf: "52998224725", birth_date: "1990-04-25", height_cm: 168 })
    expect(s!.student_health).toMatchObject({ requires_clearance: true, health_notes: "Dor no ombro esquerdo" })
    expect(s!.student_billing).toMatchObject({ due_day: 10 })
    expect(s!.consents).toHaveLength(3)
    expect(s!.measurements).toEqual([{ weight_kg: 70.5, source: "cadastro" }])

    // O link não serve mais
    await page.goto(`/cadastro/${token}`)
    await expect(page.getByRole("heading", { name: "Cadastro já enviado" })).toBeVisible()
  } finally {
    await db.from("students").delete().eq("id", studentId)
  }
})

test("link expirado ou inválido explica o que fazer", async ({ page }) => {
  const { studentId, token } = await createInvite("Expirado Teste", "15998880000")
  const db = service()
  try {
    await db.from("student_invites").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("student_id", studentId)
    await page.goto(`/cadastro/${token}`)
    await expect(page.getByRole("heading", { name: "Este link expirou" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Pedir novo link" })).toBeVisible()
    await page.goto(`/cadastro/${"x".repeat(43)}`)
    await expect(page.getByRole("heading", { name: "Link inválido" })).toBeVisible()
  } finally {
    await db.from("students").delete().eq("id", studentId)
  }
})
