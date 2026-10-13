"use server"

import { revalidatePath } from "next/cache"

import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function deleteMeasurement(id: string, studentId: string): Promise<{ ok: boolean; message?: string }> {
  await requireStaff()
  const supabase = await createClient()
  const { data, error } = await supabase.from("measurements").delete().eq("id", id).select("id")
  if (error || !data?.length) return { ok: false, message: "Não deu para apagar esta medição." }
  revalidatePath(`/alunos/${studentId}`)
  return { ok: true }
}
