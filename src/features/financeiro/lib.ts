/** Regras puras do financeiro (navegador e servidor). */
import { firstName, formatBRL, formatDate } from "@/lib/format"
import { fillTemplate } from "@/lib/whatsapp"

export type EffectiveStatus = "pendente" | "vencido" | "pago" | "cancelado"

export const STATUS_LABEL: Record<EffectiveStatus, string> = {
  pendente: "Pendente",
  vencido: "Em atraso",
  pago: "Pago",
  cancelado: "Cancelado",
}

export const PAYMENT_METHOD_LABEL = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão na maquininha",
  outro: "Outro",
} as const

export type MessageTemplates = { msg_due_today: string; msg_overdue: string; msg_reminder: string }

/** Qual mensagem usar: atraso, vence hoje ou lembrete (antes do vencimento). */
export function messageKind(dueDate: string, today: string): keyof MessageTemplates {
  if (dueDate < today) return "msg_overdue"
  if (dueDate === today) return "msg_due_today"
  return "msg_reminder"
}

export function chargeMessage(
  templates: MessageTemplates,
  charge: { full_name: string; amount_cents: number; due_date: string },
  pix: string | null,
  today: string,
) {
  return fillTemplate(templates[messageKind(charge.due_date, today)], {
    primeiro_nome: firstName(charge.full_name),
    nome: charge.full_name,
    valor: formatBRL(charge.amount_cents),
    vencimento: formatDate(charge.due_date),
    pix: pix ?? "(chave Pix ainda não configurada)",
  })
}

/** "2026-10-01" → "Outubro de 2026" */
export function competenceLabel(competence: string) {
  const label = new Date(`${competence.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
