"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth"
import { supabaseUrl } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { parseBRDate } from "@/lib/validation"

type Result<T = undefined> = { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> }

export type CampaignInput = {
  title: string
  body: string
  imageUrl: string | null
  linkUrl: string
  startsOn: string // dd/mm/aaaa
  endsOn: string
  referralBonus: boolean
}

const refresh = () => {
  revalidatePath("/campanhas", "layout")
  revalidatePath("/agora")
  revalidatePath("/meu-mes")
  revalidatePath("/financeiro", "layout")
}

export async function saveCampaign(id: string | null, input: CampaignInput): Promise<Result<{ id: string }>> {
  const admin = await requireAdmin()
  const errors: Record<string, string> = {}
  const starts = parseBRDate(input.startsOn)
  const ends = parseBRDate(input.endsOn)
  if (!input.title.trim()) errors.title = "Dê um título para a campanha."
  if (!starts) errors.startsOn = "Use o formato dd/mm/aaaa."
  if (!ends) errors.endsOn = "Use o formato dd/mm/aaaa."
  if (starts && ends && ends < starts) errors.endsOn = "O fim precisa ser depois do início."
  const link = input.linkUrl.trim()
  if (link && !/^https?:\/\/\S+$/.test(link)) errors.linkUrl = "Use um endereço completo, começando com https://"
  const prefix = `${supabaseUrl()}/storage/v1/object/public/campaigns/`
  if (input.imageUrl && !input.imageUrl.startsWith(prefix)) errors.image = "Envie a arte de novo."
  if (Object.keys(errors).length) return { ok: false, message: "Confira os campos.", fieldErrors: errors }

  const row = {
    title: input.title.trim(),
    body: input.body.trim() || null,
    image_url: input.imageUrl,
    link_url: link || null,
    starts_on: starts!,
    ends_on: ends!,
    referral_bonus: input.referralBonus,
  }
  const supabase = await createClient()
  const { data, error } = id
    ? await supabase.from("campaigns").update(row).eq("id", id).select("id").single()
    : await supabase.from("campaigns").insert({ ...row, created_by: admin.id }).select("id").single()
  if (error || !data) return { ok: false, message: "Não deu para salvar a campanha agora." }
  refresh()
  return { ok: true, data: { id: data.id } }
}

export async function deleteCampaign(id: string): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("campaigns").delete().eq("id", id)
  if (error) return { ok: false, message: "Não deu para apagar a campanha agora." }
  refresh()
  return { ok: true, data: undefined }
}
