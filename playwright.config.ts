import { defineConfig, devices } from "@playwright/test"

/**
 * - `npm run prints`: prints de revisão das telas em 375, 768 e 1024px (pasta prints/).
 * - `npm run test:e2e`: todos os testes de navegador.
 * Requer Supabase local com seed (npm run db:reset). Sobe o `next dev` se não estiver rodando.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "prints", testMatch: /prints\.spec\.ts/ },
    { name: "e2e", testMatch: /.*\.e2e\.ts/ },
  ],
})
