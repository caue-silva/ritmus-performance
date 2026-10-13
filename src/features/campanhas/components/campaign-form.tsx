"use client"

import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { CheckRow, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { maskDate } from "@/lib/validation"

import { deleteCampaign, saveCampaign, type CampaignInput } from "../actions"

/** Recorta no centro em 2:1 e reduz para 1600×800 antes de enviar. */
async function bannerJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const targetRatio = 2
  let sw = bitmap.width
  let sh = bitmap.width / targetRatio
  if (sh > bitmap.height) {
    sh = bitmap.height
    sw = bitmap.height * targetRatio
  }
  const canvas = document.createElement("canvas")
  canvas.width = 1600
  canvas.height = 800
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, 1600, 800)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85))
}

export function CampaignForm({ id, initial }: { id: string | null; initial: CampaignInput }) {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, start] = useTransition()
  const input = useRef<HTMLInputElement>(null)
  const set = <K extends keyof CampaignInput>(k: K, value: CampaignInput[K]) => {
    setV((x) => ({ ...x, [k]: value }))
    setErrors((e) => ({ ...e, [k]: "" }))
  }

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return void toast.error("Escolha uma imagem (JPG ou PNG).")
    setUploading(true)
    try {
      const blob = await bannerJpeg(file)
      const path = `${crypto.randomUUID()}.jpg`
      const supabase = createClient()
      const { error } = await supabase.storage.from("campaigns").upload(path, blob, { contentType: "image/jpeg" })
      if (error) throw error
      set("imageUrl", supabase.storage.from("campaigns").getPublicUrl(path).data.publicUrl)
    } catch (e) {
      console.error(e)
      toast.error("Não deu para enviar a arte. Tente uma imagem menor ou confira a internet.")
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveCampaign(id, v)
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {})
            toast.error(res.message)
            return
          }
          toast.success(id ? "Campanha salva." : "Campanha criada. Ela aparece para os professores no período.")
          router.push("/campanhas")
        })
      }}
    >
      <div className="grid gap-2">
        <span className="text-sm font-semibold">Arte (aparece na tela inicial dos professores)</span>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="relative grid aspect-[2/1] w-full max-w-xl place-items-center overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted text-muted-foreground hover:border-foreground/40"
        >
          {v.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- prévia da arte enviada
            <img src={v.imageUrl} alt="Prévia da arte" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="grid justify-items-center gap-2 p-4 text-center text-sm">
              <ImagePlus className="size-8" aria-hidden />
              Toque para escolher a arte
              <span className="text-xs">Formato deitado (2:1). Ex.: 1600 × 800 px. A gente recorta no centro.</span>
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="size-6 animate-spin" aria-label="Enviando" />
            </span>
          )}
        </button>
        {v.imageUrl && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
              Trocar arte
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => set("imageUrl", null)}>
              Remover arte
            </Button>
          </div>
        )}
        {errors.image && <p className="text-sm font-medium text-destructive">{errors.image}</p>}
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

      <TextField id="title" label="Título" value={v.title} onChange={(x) => set("title", x)} error={errors.title} placeholder="Ex.: Traga um amigo em outubro" />
      <TextField id="body" label="Texto curto (opcional)" value={v.body} onChange={(x) => set("body", x)} multiline placeholder="Ex.: Indicou e o aluno fechou? A 1ª mensalidade é sua." />
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <TextField id="starts" label="Começa em" value={v.startsOn} onChange={(x) => set("startsOn", x)} mask={maskDate} inputMode="numeric" error={errors.startsOn} />
        <TextField id="ends" label="Termina em" value={v.endsOn} onChange={(x) => set("endsOn", x)} mask={maskDate} inputMode="numeric" error={errors.endsOn} />
      </div>
      <TextField
        id="link"
        label="Link (opcional)"
        value={v.linkUrl}
        onChange={(x) => set("linkUrl", x)}
        inputMode="url"
        autoCapitalize="none"
        placeholder="https://"
        error={errors.linkUrl}
        hint="Se preencher, tocar na arte abre esse endereço."
      />
      <div className="grid gap-1">
        <CheckRow id="referral" checked={v.referralBonus} onChange={(x) => set("referralBonus", x)}>
          Bônus de indicação: a 1ª mensalidade de aluno ativado no período vai 100% para quem trouxe
        </CheckRow>
        <p className="px-1 text-sm text-muted-foreground">Marque “Quem trouxe o aluno” no pré-cadastro ou na ficha do aluno. O bônus entra no repasse quando o aluno pagar.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending || uploading}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {id ? "Salvar campanha" : "Criar campanha"}
        </Button>
        {id && (
          <Button type="button" size="lg" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden /> Apagar
          </Button>
        )}
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="font-display text-2xl font-bold uppercase">Apagar campanha?</DialogTitle>
          <DialogDescription>
            Ela sai da tela dos professores. Bônus de indicação já calculados deixam de valer para pagamentos ainda não feitos.
          </DialogDescription>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Manter
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                start(async () => {
                  const res = await deleteCampaign(id!)
                  if (!res.ok) return void toast.error(res.message)
                  toast.success("Campanha apagada.")
                  router.push("/campanhas")
                })
              }
            >
              Apagar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
