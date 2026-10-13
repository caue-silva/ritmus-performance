/**
 * Emissão de cobrança. Hoje: Pix estático (copia e cola + QR Code) gerado aqui,
 * com confirmação manual. Para plugar um gateway depois (Pix dinâmico, boleto,
 * cartão), basta implementar esta interface — as telas não mudam.
 */
import { buildPixPayload, type PixKeyKind } from "./pix"

export type ChargeRequest = { chargeId: string; amountCents: number; description?: string }

export type IssuedCharge = {
  kind: "pix_estatico"
  /** Pix copia e cola (BR Code). O QR Code é este mesmo texto. */
  copyPaste: string
  /** Confirmação: "manual" = o Gabriel confirma; "automatica" = o gateway avisa. */
  confirmation: "manual" | "automatica"
}

export interface PaymentProvider {
  readonly id: string
  issue(charge: ChargeRequest): IssuedCharge
}

export type PixSettings = {
  pix_key: string | null
  pix_key_type: string | null
  pix_receiver_name: string | null
  pix_city: string | null
}

export const pixReady = (s: PixSettings) => Boolean(s.pix_key && s.pix_receiver_name && s.pix_city)

export function staticPixProvider(settings: PixSettings): PaymentProvider {
  return {
    id: "pix-estatico",
    issue({ chargeId, amountCents, description }) {
      return {
        kind: "pix_estatico",
        copyPaste: buildPixPayload({
          key: settings.pix_key ?? "",
          keyType: settings.pix_key_type as PixKeyKind | null,
          receiverName: settings.pix_receiver_name ?? "",
          city: settings.pix_city ?? "",
          amountCents,
          // Identificador curto da cobrança: ajuda a achar o pagamento no extrato.
          txid: `RITMUS${chargeId.replace(/-/g, "").slice(0, 12)}`,
          description,
        }),
        confirmation: "manual",
      }
    },
  }
}
