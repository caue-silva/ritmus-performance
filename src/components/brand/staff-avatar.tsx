import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Foto do membro da equipe ou, sem foto, as iniciais. */
export function StaffAvatar({
  name,
  url,
  size = 48,
  className,
}: {
  name: string
  url?: string | null
  size?: number
  className?: string
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) }
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- foto pequena vinda do Storage; sem otimização de imagem
    return <img src={url} alt="" width={size} height={size} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />
  }
  return (
    <span
      aria-hidden
      style={style}
      className={cn("grid shrink-0 place-items-center rounded-full bg-foreground font-bold text-background", className)}
    >
      {initials(name)}
    </span>
  )
}
