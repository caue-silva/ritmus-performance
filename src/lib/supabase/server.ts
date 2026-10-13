import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from "./database.types"
import { supabasePublishableKey, supabaseUrl } from "./env"

/** Cliente com a sessão do usuário logado: todo acesso passa pelo RLS. */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Chamado de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  })
}
