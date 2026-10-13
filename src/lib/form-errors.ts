import type { z } from "zod"

/** Primeiro erro de cada campo (o mais básico, ex.: "Digite o nome" antes de "Digite nome e sobrenome"). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_")
    out[key] ??= issue.message
  }
  return out
}
