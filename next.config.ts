import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
