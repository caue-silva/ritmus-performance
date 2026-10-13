import { onlyDigits } from "@/lib/validation"

/** Link wa.me com mensagem pronta. Números brasileiros guardados só com DDD + número. */
export function whatsappLink(phone: string, message?: string) {
  const digits = onlyDigits(phone)
  const full = digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`
  return `https://wa.me/${full}${message ? `?text=${encodeURIComponent(message)}` : ""}`
}

/** Troca {variaveis} do modelo de mensagem. Variáveis desconhecidas ficam como estão. */
export function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match)
}
