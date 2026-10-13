import { config } from "dotenv"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

config({ path: ".env.local", quiet: true })

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/rls/**/*.test.ts"],
    // Testes de RLS compartilham o banco local: rodar em série.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
