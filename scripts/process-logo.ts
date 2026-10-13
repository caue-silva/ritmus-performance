/**
 * Trata o logo e gera os ícones do app.
 *
 *   npm run logo                       # usa Logo/Logo Ritmus.png
 *   npm run logo -- caminho/novo.png   # usa outro arquivo (ex.: o original do Gabriel)
 *
 * O que faz: encontra o círculo laranja, recorta só ele, deixa o fundo
 * transparente e gera public/logo-ritmus.png, os ícones do PWA e o favicon.
 * Trocar o logo = rodar este comando com o arquivo novo. Nenhum código muda.
 */
import { mkdir } from "node:fs/promises"
import path from "node:path"

import sharp from "sharp"

const input = process.argv[2] ?? "Logo/Logo Ritmus.png"
const root = process.cwd()
const out = (p: string) => path.join(root, p)

const isOrange = (r: number, g: number, b: number) => r > 170 && g > 60 && g < 150 && b < 110 && r - b > 100

async function main() {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  // 1. Pixels laranja → caixa do círculo e cor da marca (mediana).
  let minX = width, minY = height, maxX = 0, maxY = 0
  const rs: number[] = [], gs: number[] = [], bs: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
      if (a > 200 && isOrange(r, g, b)) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
        rs.push(r); gs.push(g); bs.push(b)
      }
    }
  }
  if (!rs.length) throw new Error("Não encontrei o círculo laranja no arquivo.")
  const median = (v: number[]) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)]
  const hex = "#" + [median(rs), median(gs), median(bs)].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const radius = Math.max(maxX - minX, maxY - minY) / 2 + 0.5
  const size = Math.ceil(radius * 2)
  const left = Math.max(0, Math.round(cx - size / 2))
  const top = Math.max(0, Math.round(cy - size / 2))

  // 2. Recorte quadrado + máscara circular com borda suave (sem halo branco).
  const r = size / 2 - 1
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff"/></svg>`,
  )
  const logo = await sharp(input)
    .extract({ left, top, width: Math.min(size, width - left), height: Math.min(size, height - top) })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer()

  await mkdir(out("public/icons"), { recursive: true })
  await sharp(logo).toFile(out("public/logo-ritmus.png"))

  const icon = (px: number) => sharp(logo).resize(px, px, { kernel: "lanczos3" }).png()
  await icon(192).toFile(out("public/icons/icon-192.png"))
  await icon(512).toFile(out("public/icons/icon-512.png"))
  await icon(64).toFile(out("src/app/icon.png"))

  // Maskable (Android) e Apple: fundo laranja cheio, logo dentro da área segura.
  const [br, bg, bb] = [median(rs), median(gs), median(bs)]
  const onBrand = async (px: number, scale: number, file: string) => {
    const inner = Math.round(px * scale)
    await sharp({ create: { width: px, height: px, channels: 4, background: { r: br, g: bg, b: bb, alpha: 1 } } })
      .composite([{ input: await sharp(logo).resize(inner, inner, { kernel: "lanczos3" }).png().toBuffer(), gravity: "center" }])
      .png()
      .toFile(out(file))
  }
  await onBrand(512, 0.82, "public/icons/icon-maskable-512.png")
  await onBrand(180, 0.9, "src/app/apple-icon.png")

  const upscale = 512 / size
  console.log(`✔ Logo: círculo de ${size}px recortado de ${width}×${height}px`)
  console.log(`✔ Cor da marca (mediana do laranja): ${hex}`)
  console.log(`✔ Gerados: public/logo-ritmus.png, public/icons/icon-{192,512,maskable-512}.png, src/app/{icon,apple-icon}.png`)
  if (upscale > 1) {
    console.warn(`⚠ O ícone de 512px precisou ampliar ${upscale.toFixed(1)}× o original e pode ficar borrado.`)
    console.warn("  Peça o arquivo original (SVG, PDF ou PNG ≥ 1024px) e rode: npm run logo -- caminho/do/arquivo")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
