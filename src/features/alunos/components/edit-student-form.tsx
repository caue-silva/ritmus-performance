"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FormAlert } from "@/components/feedback/form-field"
import { TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { maskCEP, maskPhone } from "@/lib/validation"

import { updateStudent, type StudentEditInput } from "../actions"

type Values = Required<{ [K in keyof StudentEditInput]: string }>

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `grupo-${title.toLowerCase().replace(/\W+/g, "-")}`
  return (
    <section role="group" aria-labelledby={id} className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <h2 id={id} className="font-display text-xl font-bold uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function EditStudentForm({ studentId, initial }: { studentId: string; initial: Values }) {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, start] = useTransition()

  const field = (name: keyof Values, label: string, props: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField
      id={name}
      label={label}
      value={v[name]}
      onChange={(value) => {
        setV((x) => ({ ...x, [name]: value }))
        if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }))
      }}
      error={errors[name]}
      {...props}
    />
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = await updateStudent(studentId, v)
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.message)
        return
      }
      toast.success("Dados salvos.")
      router.push(`/alunos/${studentId}`)
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4 pb-24 md:pb-0" noValidate>
      <Group title="Contato">
        {field("full_name", "Nome completo", { autoCapitalize: "words" })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("whatsapp", "WhatsApp", { mask: maskPhone, inputMode: "tel" })}
          {field("email", "E-mail", { inputMode: "email", type: "email", autoCapitalize: "none" })}
        </div>
      </Group>

      <Group title="Endereço">
        <div className="grid grid-cols-[1fr_5rem] gap-3 sm:grid-cols-[10rem_1fr_5rem]">
          {field("cep", "CEP", { mask: maskCEP, inputMode: "numeric", className: "col-span-2 sm:col-span-1" })}
          {field("city", "Cidade")}
          {field("state", "UF", { maxLength: 2, autoCapitalize: "characters" })}
        </div>
        {field("street", "Rua")}
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          {field("number", "Número")}
          {field("complement", "Complemento")}
        </div>
        {field("neighborhood", "Bairro")}
      </Group>

      <Group title="Emergência">
        {field("emergency_name", "Nome")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("emergency_phone", "Telefone", { mask: maskPhone, inputMode: "tel" })}
          {field("emergency_relation", "Quem é")}
        </div>
      </Group>

      <Group title="Objetivos e medidas">
        {field("goals_notes", "Objetivos (observação)", { multiline: true })}
        {field("height", "Altura", { inputMode: "decimal", suffix: "m", className: "max-w-48", hint: "Em metros (1,70) ou centímetros (170)." })}
      </Group>

      <FormAlert>{formError}</FormAlert>
      <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" className="w-full md:w-auto" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}
