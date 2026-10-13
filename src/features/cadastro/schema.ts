/**
 * Formulário público de cadastro: estrutura do rascunho, etapas e validação.
 * Usado no navegador (validação no campo) e no servidor (validação final).
 */
import { ageOn, isValidCPF, isValidPhone, onlyDigits, parseBRDate, parseDecimal, parseHeightCm } from "@/lib/validation"

export type SignupDraft = {
  full_name: string
  cpf: string
  birth_date: string // dd/mm/aaaa
  whatsapp: string
  email: string
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  emergency_name: string
  emergency_phone: string
  emergency_relation: string
  goals: string[]
  goals_notes: string
  height: string
  weight: string
  due_day: string
  parq: (boolean | null)[]
  health_notes: string
  declaration: boolean
  terms: boolean
  lgpd: boolean
}

export type Field = keyof SignupDraft
export type Errors = Partial<Record<Field, string>>

export const emptyDraft = (prefill: Partial<SignupDraft> = {}): SignupDraft => ({
  full_name: "",
  cpf: "",
  birth_date: "",
  whatsapp: "",
  email: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  emergency_name: "",
  emergency_phone: "",
  emergency_relation: "",
  goals: [],
  goals_notes: "",
  height: "",
  weight: "",
  due_day: "",
  parq: [null, null, null, null, null, null, null],
  health_notes: "",
  declaration: false,
  terms: false,
  lgpd: false,
  ...prefill,
})

export const STEPS = [
  { id: "voce", title: "Seus dados", fields: ["full_name", "cpf", "birth_date", "whatsapp", "email"] },
  { id: "endereco", title: "Endereço", fields: ["cep", "street", "number", "complement", "neighborhood", "city", "state"] },
  { id: "emergencia", title: "Contato de emergência", fields: ["emergency_name", "emergency_phone", "emergency_relation"] },
  { id: "objetivos", title: "Objetivos e medidas", fields: ["goals", "goals_notes", "height", "weight"] },
  { id: "mensalidade", title: "Mensalidade", fields: ["due_day"] },
  { id: "saude", title: "Saúde", fields: ["parq", "health_notes", "declaration"] },
  { id: "termos", title: "Termos e privacidade", fields: ["terms", "lgpd"] },
] as const satisfies readonly { id: string; title: string; fields: readonly Field[] }[]

const required = (v: string, msg: string) => (v.trim() ? undefined : msg)

/** Mensagem de erro de um campo (ou undefined se estiver ok). `today` em ISO. */
export function validateField(field: Field, d: SignupDraft, today: string): string | undefined {
  switch (field) {
    case "full_name": {
      const v = d.full_name.trim()
      if (!v) return "Digite seu nome completo."
      if (v.split(/\s+/).length < 2) return "Digite nome e sobrenome."
      return undefined
    }
    case "cpf":
      if (!onlyDigits(d.cpf)) return "Digite seu CPF."
      return isValidCPF(d.cpf) ? undefined : "Esse CPF não parece certo. Confira os números."
    case "birth_date": {
      if (!d.birth_date.trim()) return "Digite sua data de nascimento."
      const iso = parseBRDate(d.birth_date)
      if (!iso) return "Use o formato dd/mm/aaaa, por exemplo 25/04/1990."
      const age = ageOn(iso, today)
      if (age < 10 || age > 100) return "Confira o ano de nascimento."
      return undefined
    }
    case "whatsapp":
      if (!onlyDigits(d.whatsapp)) return "Digite seu WhatsApp com DDD."
      return isValidPhone(d.whatsapp) ? undefined : "Confira o número com DDD, por exemplo (15) 99123-4567."
    case "email":
      if (!d.email.trim()) return undefined
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim()) ? undefined : "Esse e-mail não parece certo."
    case "cep":
      if (!onlyDigits(d.cep)) return "Digite seu CEP."
      return onlyDigits(d.cep).length === 8 ? undefined : "O CEP tem 8 números."
    case "street":
      return required(d.street, "Digite a rua.")
    case "number":
      return required(d.number, "Digite o número (ou “s/n”).")
    case "neighborhood":
      return required(d.neighborhood, "Digite o bairro.")
    case "city":
      return required(d.city, "Digite a cidade.")
    case "state":
      if (!d.state.trim()) return "Digite o estado (UF)."
      return /^[A-Za-z]{2}$/.test(d.state.trim()) ? undefined : "Use a sigla do estado, por exemplo SP."
    case "emergency_name":
      return required(d.emergency_name, "Digite o nome de alguém para avisarmos se precisar.")
    case "emergency_phone":
      if (!onlyDigits(d.emergency_phone)) return "Digite o telefone com DDD."
      if (!isValidPhone(d.emergency_phone)) return "Confira o número com DDD."
      return onlyDigits(d.emergency_phone) === onlyDigits(d.whatsapp)
        ? "Use o telefone de outra pessoa, não o seu."
        : undefined
    case "emergency_relation":
      return required(d.emergency_relation, "Conte quem é essa pessoa (mãe, cônjuge, amigo…).")
    case "goals":
      return d.goals.length || d.goals_notes.trim() ? undefined : "Escolha pelo menos um objetivo."
    case "height": {
      if (!d.height.trim()) return "Digite sua altura."
      const cm = parseHeightCm(d.height)
      return cm && cm >= 100 && cm <= 250 ? undefined : "Digite a altura em metros (1,70) ou centímetros (170)."
    }
    case "weight": {
      if (!d.weight.trim()) return "Digite seu peso (pode ser aproximado)."
      const kg = parseDecimal(d.weight)
      return kg && kg >= 20 && kg <= 300 ? undefined : "Digite o peso em kg, por exemplo 72,5."
    }
    case "due_day": {
      const n = Number(d.due_day)
      return Number.isInteger(n) && n >= 1 && n <= 31 ? undefined : "Escolha o dia do mês para pagar."
    }
    case "parq":
      return d.parq.length === 7 && d.parq.every((a) => a !== null) ? undefined : "Responda todas as perguntas."
    case "declaration":
      return d.declaration ? undefined : "Para continuar, marque a declaração."
    case "terms":
      return d.terms ? undefined : "Para enviar, aceite os termos de uso."
    case "lgpd":
      return d.lgpd ? undefined : "Para enviar, autorize o uso dos seus dados."
    default:
      return undefined
  }
}

export function validateStep(stepIndex: number, d: SignupDraft, today: string): Errors {
  const errors: Errors = {}
  for (const f of STEPS[stepIndex]!.fields) {
    const msg = validateField(f, d, today)
    if (msg) errors[f] = msg
  }
  return errors
}

export function validateAll(d: SignupDraft, today: string): Errors {
  return STEPS.reduce<Errors>((acc, _, i) => ({ ...acc, ...validateStep(i, d, today) }), {})
}

export function stepOfField(field: Field) {
  return STEPS.findIndex((s) => (s.fields as readonly Field[]).includes(field))
}

/** Converte o rascunho validado no formato gravado pelo banco (submit_signup). */
export function toSubmission(d: SignupDraft) {
  return {
    full_name: d.full_name.trim().replace(/\s+/g, " "),
    cpf: onlyDigits(d.cpf),
    birth_date: parseBRDate(d.birth_date),
    whatsapp: onlyDigits(d.whatsapp),
    email: d.email.trim().toLowerCase(),
    cep: onlyDigits(d.cep),
    street: d.street.trim(),
    number: d.number.trim(),
    complement: d.complement.trim(),
    neighborhood: d.neighborhood.trim(),
    city: d.city.trim(),
    state: d.state.trim().toUpperCase(),
    emergency_name: d.emergency_name.trim(),
    emergency_phone: onlyDigits(d.emergency_phone),
    emergency_relation: d.emergency_relation.trim(),
    goals: d.goals,
    goals_notes: d.goals_notes.trim(),
    height_cm: parseHeightCm(d.height),
    weight_kg: parseDecimal(d.weight),
    due_day: Number(d.due_day),
    parq: d.parq.map(Boolean),
    health_notes: d.health_notes.trim(),
  }
}

/** Garante que um rascunho vindo do banco/navegador tenha o formato esperado. */
export function sanitizeDraft(raw: unknown, prefill: Partial<SignupDraft>): SignupDraft {
  const base = emptyDraft(prefill)
  if (!raw || typeof raw !== "object") return base
  const r = raw as Record<string, unknown>
  const out = { ...base } as Record<string, unknown>
  for (const key of Object.keys(base) as Field[]) {
    const v = r[key]
    const def = base[key]
    if (typeof def === "string" && typeof v === "string") out[key] = v.slice(0, 500)
    else if (typeof def === "boolean" && typeof v === "boolean") out[key] = v
    else if (key === "goals" && Array.isArray(v)) out[key] = v.filter((g) => typeof g === "string").slice(0, 10)
    else if (key === "parq" && Array.isArray(v) && v.length === 7)
      out[key] = v.map((a) => (typeof a === "boolean" ? a : null))
  }
  return out as SignupDraft
}
