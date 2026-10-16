import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server"

import { midiaGuard, midiaTrack } from "@/lib/midia-agent"
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env"

// Rotas abertas (sem login). O resto exige sessão.
const PUBLIC_PREFIXES = ["/login", "/cadastro"]

/** Renova a sessão do Supabase e manda quem não está logado para /login. */
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Monitor da Midia Performance: aberto, sem sessão e sem contar como acesso.
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next()

  // Modo manutenção ligado no console da Midia Performance: todos veem a página de manutenção.
  const blocked = await midiaGuard(request)
  if (blocked) return blocked
  // Registra o acesso em segundo plano (caminho limpo, sem IP gravado). Não atrasa a resposta.
  midiaTrack(request, event)

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
  const { data, error } = await supabase.auth.getClaims()
  const loggedIn = Boolean(data?.claims?.sub)

  // Sessão que não existe mais (ex.: banco recriado, conta removida): limpa os cookies
  // na primeira vez, em vez de tentar renovar a cada requisição.
  if (error && "code" in error && (error.code === "refresh_token_not_found" || error.code === "session_not_found")) {
    await supabase.auth.signOut({ scope: "local" })
  }

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
    "/((?!_next/static|_next/image|favicon.ico|icons/|logo-ritmus.png|manifest.webmanifest|sw.js|offline.html|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
}
