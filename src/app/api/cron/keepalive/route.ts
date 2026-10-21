import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Ping diário no banco (Vercel Cron, ver vercel.json) para o Supabase gratuito não pausar
 * o projeto por inatividade. Lê só o `id` de studio_settings: nenhum dado sai daqui.
 * Remover quando o projeto for para o plano pago (Pro não pausa).
 *
 * A Vercel envia `Authorization: Bearer <CRON_SECRET>`. Com CRON_SECRET cadastrado, só ela
 * consegue chamar; sem ele a rota fica aberta (o ping é inofensivo, igual ao /api/health).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 })
  }

  const { error } = await createAdminClient().from("studio_settings").select("id").limit(1)
  if (error) {
    console.error("keepalive: o banco não respondeu", error.message)
    return Response.json({ ok: false, error: error.message }, { status: 503 })
  }
  return Response.json({ ok: true, at: new Date().toISOString() })
}
