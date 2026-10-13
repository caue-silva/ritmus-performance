function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}. Veja .env.example.`)
  return value
}

// Acesso literal (process.env.NOME) para o Next.js conseguir embutir as públicas no bundle.
export const supabaseUrl = () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)
export const supabasePublishableKey = () =>
  required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
