import "server-only"

import { todaySP } from "@/lib/dates"
import type { Tables } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

export type Campaign = Tables<"campaigns">

/** Campanhas no ar hoje (até 3, as mais recentes primeiro). */
export async function getActiveCampaigns(limit = 3): Promise<Campaign[]> {
  const supabase = await createClient()
  const today = todaySP()
  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .lte("starts_on", today)
    .gte("ends_on", today)
    .order("starts_on", { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("campaigns").select("*").order("starts_on", { ascending: false })
  return data ?? []
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = await createClient()
  const { data } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle()
  return data
}
