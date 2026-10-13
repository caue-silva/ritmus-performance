"use client"

import { Check, Copy } from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/** QR Code + Pix copia e cola, para o aluno pagar na hora (ex.: no balcão). */
export function PixBox({ payload }: { payload: string }) {
  const [svg, setSvg] = useState<string>()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b0b0b", light: "#ffffff" } }).then((s) => {
      if (alive) setSvg(s)
    })
    return () => {
      alive = false
    }
  }, [payload])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      toast.success("Pix copia e cola copiado.")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Não deu para copiar. Segure o dedo no código para copiar.")
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-start">
      <div
        role="img"
        aria-label="QR Code do Pix desta mensalidade"
        className="mx-auto aspect-square w-48 rounded-xl bg-white p-2 sm:mx-0 [&_svg]:h-full [&_svg]:w-full"
        // SVG gerado localmente pela biblioteca de QR Code a partir do próprio payload.
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <div className="grid gap-2">
        <p className="text-sm font-semibold">Pix copia e cola</p>
        <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all select-all">{payload}</p>
        <Button variant="outline" onClick={copy} className="justify-self-start">
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} Copiar código
        </Button>
      </div>
    </div>
  )
}
