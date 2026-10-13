import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // O indicador do modo dev fica no canto inferior esquerdo, em cima dos botões do app.
  devIndicators: false,
  // Sem Cache Components: o app é todo autenticado e cada leitura depende do usuário (RLS),
  // então renderizamos por requisição e usamos loading.tsx (skeletons) para o carregamento.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
