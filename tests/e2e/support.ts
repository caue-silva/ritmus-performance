import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import type { Page } from "@playwright/test"

config({ path: ".env.local", quiet: true })

export const PASSWORD = process.env.SEED_PASSWORD ?? "ritmus-local-123"
export const USERS = { admin: "gabriel@ritmus.test", personal: "ana@ritmus.test" } as const

export const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
] as const

export const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
}
