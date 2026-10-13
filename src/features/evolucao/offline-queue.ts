"use client"

/**
 * Fila de medições pendentes, para sinal ruim no estúdio.
 *
 * A medição entra na fila na hora (o personal já pode seguir a aula), é enviada
 * em seguida e, se falhar por rede, fica guardada no aparelho e é reenviada
 * sozinha: quando a conexão volta, a cada 20s e quando o app abre.
 * O `client_id` gerado aqui torna o reenvio seguro (o banco ignora duplicadas).
 */
import { useSyncExternalStore } from "react"

import { createClient } from "@/lib/supabase/client"

export type PendingMeasurement = {
  client_id: string
  student_id: string
  student_name: string
  session_id: string | null
  measured_at: string
  weight_kg: number | null
  waist_cm: number | null
  abdomen_cm: number | null
  notes: string | null
  /** "pendente": aguardando envio. "erro": o servidor recusou (não adianta reenviar). */
  state: "pendente" | "erro"
  error?: string
}

const KEY = "ritmus:medicoes-pendentes"
export const SYNCED_EVENT = "ritmus:medicoes-enviadas"

const listeners = new Set<() => void>()
let cache: PendingMeasurement[] | null = null

function read(): PendingMeasurement[] {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]") as PendingMeasurement[]
  } catch {
    cache = []
  }
  return cache
}

function write(items: PendingMeasurement[]) {
  cache = items
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // Sem armazenamento (aba anônima cheia etc.): a fila vive só em memória.
  }
  listeners.forEach((l) => l())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null
      listener()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

const EMPTY: PendingMeasurement[] = []

/** Medições ainda não confirmadas pelo servidor (reativo). */
export function usePendingMeasurements() {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

export function discardMeasurement(clientId: string) {
  write(read().filter((m) => m.client_id !== clientId))
}

const isNetworkError = (e: unknown) => {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : String(e)
  return /fetch|network|load failed|timeout|offline/i.test(msg)
}

async function send(m: PendingMeasurement): Promise<"ok" | "rede" | { erro: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "rede"
  try {
    const { error } = await createClient()
      .from("measurements")
      .upsert(
        {
          client_id: m.client_id,
          student_id: m.student_id,
          session_id: m.session_id,
          measured_at: m.measured_at,
          weight_kg: m.weight_kg,
          waist_cm: m.waist_cm,
          abdomen_cm: m.abdomen_cm,
          notes: m.notes,
        },
        { onConflict: "client_id", ignoreDuplicates: true },
      )
    if (!error) return "ok"
    if (isNetworkError(error)) return "rede"
    if (error.code === "42501") return { erro: "Você não tem permissão para medir este aluno." }
    if (error.code === "23514") return { erro: "Algum valor está fora do normal. Confira e registre de novo." }
    return { erro: "O servidor não aceitou esta medição." }
  } catch (e) {
    return isNetworkError(e) ? "rede" : { erro: "O servidor não aceitou esta medição." }
  }
}

let flushing: Promise<void> | null = null

/** Envia tudo o que está pendente. Seguro chamar várias vezes. */
export function flushMeasurements(): Promise<void> {
  if (flushing) return flushing
  flushing = (async () => {
    let sent = 0
    for (const m of read().filter((x) => x.state === "pendente")) {
      const result = await send(m)
      if (result === "rede") break // sem conexão: tenta de novo depois
      if (result === "ok") {
        write(read().filter((x) => x.client_id !== m.client_id))
        sent++
      } else {
        write(read().map((x) => (x.client_id === m.client_id ? { ...x, state: "erro", error: result.erro } : x)))
      }
    }
    if (sent) window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: { sent } }))
  })().finally(() => {
    flushing = null
  })
  return flushing
}

export type SaveResult = { clientId: string; status: "enviada" | "pendente" | "erro"; error?: string }

/** Coloca na fila e tenta enviar na hora. */
export async function saveMeasurement(m: Omit<PendingMeasurement, "state" | "client_id">): Promise<SaveResult> {
  const clientId = crypto.randomUUID()
  write([...read(), { ...m, client_id: clientId, state: "pendente" }])
  await flushMeasurements()
  const left = read().find((x) => x.client_id === clientId)
  if (!left) return { clientId, status: "enviada" }
  return left.state === "erro" ? { clientId, status: "erro", error: left.error } : { clientId, status: "pendente" }
}
