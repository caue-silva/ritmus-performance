"use client"

/** Erro no próprio layout raiz (ex.: app sem conexão com o banco). Precisa ter html/body e estilos próprios. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#0b0b0b",
          color: "#f5f5f4",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <title>Algo deu errado · Ritmus</title>
        <main style={{ maxWidth: "22rem", display: "grid", gap: 16, justifyItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- página sem o layout do app */}
          <img src="/logo-ritmus.png" alt="Ritmus Performance" width={88} height={88} style={{ borderRadius: "50%" }} />
          <h1 style={{ margin: 0, fontSize: "2rem", textTransform: "uppercase", fontWeight: 800 }}>Algo deu errado</h1>
          <p style={{ margin: 0, color: "#a8a29e", lineHeight: 1.5 }}>
            O app não conseguiu carregar agora. Tente de novo em instantes. Se continuar, avise o Gabriel.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ minHeight: 52, padding: "0 24px", border: 0, borderRadius: 12, background: "#f05b2a", color: "#0b0b0b", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  )
}
