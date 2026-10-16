/**
 * Midia Performance — agente para sistemas Next.js (App Router, Next 15+/16).
 *
 * Copie este arquivo para `src/lib/midia-agent.ts` do sistema do cliente e configure:
 *   MIDIA_ENDPOINT = https://SEU-CONSOLE          (endereço do console)
 *   MIDIA_KEY      = mp_…                          (chave gerada ao plugar o sistema)
 *
 * O que ele faz (e só isso):
 *   - registra cada acesso (método, caminho sem query string, IP*, navegador*, país, origem);
 *     *IP e navegador viram um hash diário no console: nunca são gravados;
 *     trechos do caminho que parecem ID ou token (links secretos) viram [id] / [token];
 *   - registra logins e saídas quando você chama midiaAuthEvent (e-mail, IP, data/hora, resultado),
 *     guardados por 6 meses no console (Marco Civil da Internet, art. 15). Nunca senha nem token;
 *   - reporta erros do servidor (mensagem, caminho, digest);
 *   - responde /api/health para o monitor de disponibilidade;
 *   - mostra a página de manutenção quando você liga o modo manutenção no console.
 * Não lê banco, sessão, cookies nem dados de negócio.
 *
 * Instalação: veja docs/AGENTE.md no repositório do console (ou a tela do sistema no console).
 */
import { NextResponse, after, type NextFetchEvent, type NextRequest } from "next/server"

const ENDPOINT = (process.env.MIDIA_ENDPOINT ?? "").replace(/\/+$/, "")
const KEY = process.env.MIDIA_KEY ?? ""
const enabled = Boolean(ENDPOINT && KEY)

const STATUS_TTL_MS = 20_000
let statusCache: { level: string; at: number } | null = null

/** Nível de proteção atual (cache de 20s; se o console estiver fora, não bloqueia nada). */
async function protectionLevel(): Promise<string> {
  if (!enabled) return "normal"
  if (statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) return statusCache.level
  try {
    const res = await fetch(`${ENDPOINT}/api/agent/status`, {
      headers: { authorization: `Bearer ${KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    })
    const level = res.ok ? ((await res.json()) as { protection?: string }).protection ?? "normal" : "normal"
    statusCache = { level, at: Date.now() }
    return level
  } catch {
    statusCache = { level: statusCache?.level ?? "normal", at: Date.now() }
    return statusCache.level
  }
}

function send(body: unknown) {
  return fetch(`${ENDPOINT}/api/ingest`, {
    method: "POST",
    headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  }).catch(() => undefined)
}

const MAINTENANCE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Em manutenção</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#0b0b0b;color:#f5f5f4;text-align:center;padding:24px}
main{max-width:26rem}h1{font-size:1.75rem;margin:0 0 .5rem}p{color:#a8a29e;line-height:1.5;margin:0}</style></head>
<body><main><h1>Voltamos já</h1><p>Estamos fazendo uma manutenção para manter tudo seguro. Tente de novo em alguns minutos.</p></main></body></html>`

/**
 * Chame no início do `proxy` (ou `middleware`). Devolve uma resposta de manutenção
 * quando o modo manutenção estiver ligado; senão `null` (siga normalmente).
 */
export async function midiaGuard(request: NextRequest): Promise<NextResponse | null> {
  if (request.nextUrl.pathname === "/api/health") return null
  if ((await protectionLevel()) !== "maintenance") return null
  return new NextResponse(MAINTENANCE_HTML, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8", "retry-after": "300", "cache-control": "no-store" },
  })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN = /^[A-Za-z0-9_-]{24,}$/

/** Troca IDs (UUID) e tokens (links secretos, ex.: /cadastro/<token>) por marcadores. */
export function midiaPath(path: string) {
  return path
    .split("/")
    .map((seg) => (UUID.test(seg) ? "[id]" : TOKEN.test(seg) ? "[token]" : seg))
    .join("/")
}

/** Registra o acesso em segundo plano (não atrasa a resposta). */
export function midiaTrack(request: NextRequest, event: NextFetchEvent) {
  if (!enabled) return
  const h = request.headers
  // Pré-carregamento de links não é visita.
  if (h.get("next-router-prefetch") || h.get("purpose") === "prefetch") return
  event.waitUntil(
    send({
      events: [
        {
          at: new Date().toISOString(),
          method: request.method,
          path: midiaPath(request.nextUrl.pathname),
          ip: h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim(),
          ua: h.get("user-agent") ?? undefined,
          country: h.get("x-vercel-ip-country") ?? undefined,
          referrer: h.get("referer") ?? undefined,
        },
      ],
    }),
  )
}

/**
 * Rota de saúde: `export const GET = midiaHealth(async () => { ...checagem opcional... })`
 * em `src/app/api/health/route.ts`. A checagem pode, por exemplo, fazer um select simples no banco.
 */
export function midiaHealth(check?: () => Promise<void>) {
  return async function GET() {
    const started = Date.now()
    try {
      await check?.()
      return Response.json({ ok: true, ms: Date.now() - started }, { headers: { "cache-control": "no-store" } })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return Response.json({ ok: false, error: message.slice(0, 200) }, { status: 503, headers: { "cache-control": "no-store" } })
    }
  }
}

/** Em `instrumentation.ts`: `export { midiaOnRequestError as onRequestError } from "@/lib/midia-agent"` */
export async function midiaOnRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routeType: string },
) {
  if (!enabled) return
  const message = err instanceof Error ? err.message : String(err)
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined
  await send({
    errors: [{ at: new Date().toISOString(), method: request.method, path: request.path, message: message.slice(0, 2000), digest, routeType: context.routeType }],
  })
}

export type MidiaAuthEvent = {
  /** success = entrou · failure = tentativa que falhou · logout = saiu */
  outcome: "success" | "failure" | "logout"
  /** E-mail digitado (também nas falhas: é o que permite ver tentativas contra uma conta). */
  email?: string
  /** ID do usuário no sistema (ex.: auth.users.id), quando houver. */
  userId?: string
  /** Como entrou: "senha", "link", "google"… */
  method?: string
  /** Motivo da falha, em poucas palavras ("senha incorreta", "conta desativada"). Nunca a senha. */
  reason?: string
}

/**
 * Registra um login, uma tentativa que falhou ou uma saída. Chame na Server Action de login/logout:
 *
 *   import { headers } from "next/headers"
 *   midiaAuthEvent(await headers(), { outcome: "success", email, userId: user.id, method: "senha" })
 *
 * Envia depois da resposta (after), então não atrasa o login nem atrapalha o redirect.
 */
export function midiaAuthEvent(headers: Headers, event: MidiaAuthEvent) {
  if (!enabled) return
  const payload = {
    auth: [
      {
        at: new Date().toISOString(),
        outcome: event.outcome,
        email: event.email?.trim().toLowerCase().slice(0, 254) || undefined,
        userId: event.userId?.slice(0, 100),
        method: event.method?.slice(0, 30),
        reason: event.reason?.slice(0, 120),
        ip: headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
        ua: headers.get("user-agent")?.slice(0, 500) ?? undefined,
        country: headers.get("x-vercel-ip-country") ?? undefined,
      },
    ],
  }
  try {
    after(() => send(payload))
  } catch {
    // Fora de uma requisição (ex.: script): envia direto.
    void send(payload)
  }
}
