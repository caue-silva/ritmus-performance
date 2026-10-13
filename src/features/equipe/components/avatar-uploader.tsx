"use client"

import { Camera, Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { StaffAvatar } from "@/components/brand/staff-avatar"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

import { setStaffAvatar } from "../avatar-actions"

/** Recorta no centro e reduz para 320px antes de enviar (foto do celular tem vários MB). */
async function squareJpeg(file: File, size = 320): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85))
}

export function AvatarUploader({
  staffId,
  name,
  url,
  size = 72,
  compact,
}: {
  staffId: string
  name: string
  url: string | null
  size?: number
  compact?: boolean
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return void toast.error("Escolha uma foto (JPG ou PNG).")
    setBusy(true)
    try {
      const blob = await squareJpeg(file)
      const path = `${staffId}/${Date.now()}.jpg`
      const supabase = createClient()
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true })
      if (error) throw error
      const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
      const res = await setStaffAvatar(staffId, publicUrl)
      if (!res.ok) throw new Error(res.message)
      toast.success("Foto atualizada.")
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error("Não deu para enviar a foto. Tente uma foto menor ou confira a internet.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  const remove = async () => {
    setBusy(true)
    const res = await setStaffAvatar(staffId, null)
    setBusy(false)
    if (!res.ok) return void toast.error(res.message)
    toast.success("Foto removida.")
    router.refresh()
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={url ? `Trocar a foto de ${name}` : `Adicionar foto de ${name}`}
        className="group relative shrink-0 rounded-full focus-visible:outline-offset-4"
      >
        <StaffAvatar name={name} url={url} size={size} />
        <span className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full border-2 border-card bg-brand text-brand-foreground">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
        </span>
      </button>
      {!compact && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
            <Camera aria-hidden /> {url ? "Trocar foto" : "Adicionar foto"}
          </Button>
          {url && (
            <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>
              <Trash2 aria-hidden /> Remover
            </Button>
          )}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void upload(f)
        }}
      />
    </div>
  )
}
