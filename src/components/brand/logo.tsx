import Image from "next/image"

import { cn } from "@/lib/utils"

/** Logo do estúdio. Para trocar o arquivo: `npm run logo -- caminho/do/logo.png`. */
export function Logo({ size = 40, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo-ritmus.png"
      alt="Ritmus Performance"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full", className)}
    />
  )
}
