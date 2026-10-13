import { createHash, randomBytes } from "node:crypto"

/** Token do link de cadastro: 32 bytes aleatórios (base64url). Só o hash vai para o banco. */
export const generateToken = () => randomBytes(32).toString("base64url")

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

/** Senha temporária legível (sem 0/O, 1/l/I): ex. "ritmus-k7m4-p9xa". */
export function generateTempPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
  const bytes = randomBytes(8)
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length])
  return `ritmus-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`
}
