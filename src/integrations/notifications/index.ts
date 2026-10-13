/**
 * Canal de notificação ao aluno. Hoje só existe o link do WhatsApp (wa.me),
 * aberto pelo Gabriel com um toque. Para plugar e-mail ou WhatsApp Cloud API
 * depois, basta implementar esta interface — quem chama não muda.
 */
import { whatsappLink } from "@/lib/whatsapp"

export type Recipient = { name: string; phone: string; email?: string | null }

export type DeliveryResult =
  | { kind: "link"; url: string } // o usuário precisa abrir o link para enviar
  | { kind: "sent"; id: string } // enviado automaticamente

export interface NotificationChannel {
  readonly id: string
  send(to: Recipient, message: string): Promise<DeliveryResult>
}

export const whatsappLinkChannel: NotificationChannel = {
  id: "whatsapp-link",
  async send(to, message) {
    return { kind: "link", url: whatsappLink(to.phone, message) }
  },
}

export const defaultChannel = whatsappLinkChannel
