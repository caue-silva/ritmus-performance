# Ritmus Performance

Sistema de gestão do estúdio Ritmus Performance (Pilar do Sul/SP): alunos, agenda, evolução, financeiro e cobrança. Web app mobile-first, instalável no celular.

## Rodar localmente

Pré-requisitos: Node 20.9+, Docker Desktop aberto e o [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`brew install supabase/tap/supabase`).

```bash
npm install
npm run db:start              # sobe o Supabase local
cp .env.example .env.local    # preencha com os valores de `supabase status -o env`
npm run db:reset              # cria o banco e os dados fictícios
npm run dev                   # http://localhost:3000
```

Contas de teste (só local): `gabriel@ritmus.test` (admin), `ana@ritmus.test` e `bruno@ritmus.test` (personais). A senha está em `scripts/seed.ts`.

## Testes

```bash
npm test            # unitários
npm run test:rls    # permissões no banco (RLS)
npm run test:e2e    # fluxos no navegador e acessibilidade
npm run prints      # prints das telas em 375/768/1024px (pasta prints/)
```

## Trocar o logo

```bash
npm run logo -- caminho/do/logo-original.png
```

Gera `public/logo-ritmus.png`, o favicon e os ícones do app. Nenhum código precisa mudar.

## Publicar

Veja `docs/DEPLOY.md` (Supabase + Vercel + conta do admin).

Documentação: `docs/PEDIDO.md` (especificação), `docs/PLANO.md` (plano técnico) e `CLAUDE.md` (convenções).
