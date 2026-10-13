"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type TextFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  /** Chamado com o valor já mascarado (ex.: buscar CEP). */
  onValue?: (value: string) => void
  mask?: (value: string) => string
  error?: string
  hint?: string
  suffix?: string
  prefix?: string
  multiline?: boolean
} & Omit<React.ComponentProps<"input">, "onChange" | "value" | "id" | "prefix">

/** Campo de texto com rótulo, máscara, teclado certo e erro no próprio campo. */
export function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  onValue,
  mask,
  error,
  hint,
  suffix,
  prefix,
  multiline,
  className,
  ...props
}: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const handle = (raw: string) => {
    const v = mask ? mask(raw) : raw
    onChange(v)
    onValue?.(v)
  }
  return (
    <div data-field={id} className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => handle(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          placeholder={props.placeholder}
          rows={3}
        />
      ) : (
        <div className="relative">
          <Input
            id={id}
            value={value}
            onChange={(e) => handle(e.target.value)}
            onBlur={onBlur}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(suffix && "pr-12", prefix && "pl-11")}
            {...props}
          />
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-muted-foreground">{prefix}</span>
          )}
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">{suffix}</span>
          )}
        </div>
      )}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground" aria-live="polite">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Botão que liga/desliga (objetivos, dia de vencimento). */
export function ChipToggle({
  pressed,
  onPressedChange,
  big,
  children,
}: {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  big?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border px-4 font-semibold transition-colors",
        big ? "min-h-tap-lg rounded-xl text-base" : "min-h-tap text-sm",
        pressed ? "border-foreground bg-foreground text-background" : "border-input bg-card hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  )
}

/** Sim / Não grandes, com semântica de radio. */
export function YesNo({
  value,
  onChange,
  labelledBy,
}: {
  value: boolean | null
  onChange: (value: boolean) => void
  labelledBy: string
}) {
  const option = (v: boolean, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === v}
      onClick={() => onChange(v)}
      className={cn(
        "min-h-tap flex-1 rounded-lg border text-base font-semibold transition-colors",
        value === v
          ? v
            ? "border-brand bg-brand text-brand-foreground"
            : "border-foreground bg-foreground text-background"
          : "border-input bg-background hover:border-foreground/40",
      )}
    >
      {label}
    </button>
  )
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex gap-2">
      {option(false, "Não")}
      {option(true, "Sim")}
    </div>
  )
}

/** Caixa de seleção com área de toque grande (a linha inteira). */
export function CheckRow({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1">
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-tap cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-medium transition-colors",
          checked ? "border-foreground bg-card" : error ? "border-destructive bg-card" : "border-input bg-card",
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="size-6 shrink-0 accent-[var(--brand)]"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** "36000" (centavos) ↔ "360,00" enquanto digita: só números, vírgula automática. */
export function maskMoney(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 8)
  if (!digits) return ""
  const cents = digits.padStart(3, "0")
  const int = cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${int},${cents.slice(-2)}`
}

export const centsToMoneyInput = (cents: number | null | undefined) => (cents ? maskMoney(String(cents)) : "")

export function MoneyField(props: Omit<React.ComponentProps<typeof TextField>, "mask" | "inputMode" | "prefix">) {
  return <TextField {...props} mask={maskMoney} inputMode="numeric" placeholder={props.placeholder ?? "0,00"} prefix="R$" />
}
