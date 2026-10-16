import { midiaHealth } from "@/lib/midia-agent"
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env"

/**
 * Saúde do app para o monitor da Midia Performance (verificado a cada minuto).
 * Confere também se o Supabase responde, sem ler nenhum dado.
 */
export const GET = midiaHealth(async () => {
  const res = await fetch(`${supabaseUrl()}/auth/v1/health`, {
    headers: { apikey: supabasePublishableKey() },
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) throw new Error(`Supabase respondeu ${res.status}`)
})
