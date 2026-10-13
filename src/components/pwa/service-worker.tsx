"use client"

import { useEffect } from "react"

/**
 * Registra o service worker só em produção. Em desenvolvimento ele guardaria
 * JS/CSS antigos (e a tela ficaria desatualizada), então removemos qualquer um.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
      return
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {})
  }, [])
  return null
}
