import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env"

// Rotas abertas (sem login). O resto exige sessão.
const PUBLIC_PREFIXES = ["/login", "/cadastro"]

/** Renova a sessão do Supabase e manda quem não está logado para /login. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  // Não colocar código entre createServerClient e getClaims: é aqui que a sessão é renovada.
  const { data } = await supabase.auth.getClaims()
  const loggedIn = Boolean(data?.claims?.sub)

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!loggedIn && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = pathname === "/" ? "" : `?voltar=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos, ícones, manifest e service worker.
    "/((?!_next/static|_next/image|favicon.ico|icons/|logo-ritmus.png|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
}
