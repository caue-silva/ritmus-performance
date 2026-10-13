# Ritmus Performance — convenções do projeto

@AGENTS.md

Especificação: `docs/PEDIDO.md`. Plano aprovado (modelo de dados, telas, fases e decisões): `docs/PLANO.md`.
Atualize este arquivo quando uma convenção mudar.

## Stack
- Next.js 16 (App Router, Turbopack, `src/proxy.ts` no lugar de middleware) + TypeScript estrito.
- **Sem Cache Components** (`cacheComponents` desligado): tudo é autenticado e depende do RLS, então as páginas renderizam por requisição; carregamento com `loading.tsx` (skeletons).
- Tailwind v4 (config no CSS, `src/app/globals.css`) + shadcn/ui (estilo radix-nova, `cn` do pacote `cn`).
- Supabase (Postgres, Auth, RLS) local via Docker. Recharts (Fase 4). Vitest + Playwright.
- npm (não há pnpm).

## Comandos
```
npm run db:start      # sobe o Supabase local (Docker precisa estar aberto)
npm run db:reset      # recria o banco: migrations + seed.sql + scripts/seed.ts
npm run db:types      # regenera src/lib/supabase/database.types.ts (rode após mudar o schema)
npm run dev           # app em http://localhost:3000
npm test              # testes unitários (tests/unit)
npm run test:rls      # políticas RLS contra o banco local (tests/rls)
npm run test:e2e      # fluxos no navegador (tests/e2e/*.e2e.ts)
npm run prints        # prints 375/768/1024 em prints/<fase>/ (PRINTS_PHASE=fase-N)
npm run logo -- arq   # trata um logo novo e regenera logo + ícones
```
Contas do seed (só local): gabriel@ritmus.test (admin), ana@ritmus.test e bruno@ritmus.test (personais). Senha: `SEED_PASSWORD` em `scripts/seed.ts`.

## Banco e segurança (crítico)
- Toda mudança de schema = nova migration em `supabase/migrations/` (nunca editar uma já aplicada em produção). Depois: `npm run db:reset && npm run db:types`.
- **RLS em toda tabela**, políticas em `*_rls.sql` (ou na migration da tabela nova, com o mesmo padrão). `anon` não acessa nada.
- Helpers de política ficam no schema `app` (não exposto): `app.is_admin()`, `app.is_staff()`, `app.owns_student()`, `app.owns_slot()`, `app.owns_session()`. Use `(select app.is_admin())` nas políticas.
- **Financeiro só para admin.** Colunas de dinheiro vivem apenas em `student_billing`, `charges`, `charge_events`, `studio_settings`. Nunca adicionar coluna financeira em tabela legível por personal, nem criar view/RPC acessível ao personal que junte essas tabelas. Nenhuma tela, badge ou contador pode revelar ao personal se um aluno está em dia.
- PAR-Q/saúde (`student_health`): personal lê só dos próprios alunos; dono de horário **não** vê saúde de aluno de reposição.
- Regras de negócio que importam (capacidade 4, um horário por vez, ativação exige liberação médica, quem pode mudar status) são garantidas por **constraint/trigger no banco**, com mensagem de erro em pt-BR — a UI só repete a regra.
- Service role: só `src/lib/supabase/admin.ts` (`server-only`), e só para contas da equipe e o formulário público por token. Sempre checar permissão de quem chamou antes.
- Todo teste novo de permissão vai em `tests/rls/`.

## Código
- Identificadores em inglês (tabelas, funções, componentes); rotas e textos da interface em pt-BR (`/alunos`, `/financeiro`).
- Leitura em Server Components com `createClient()` de `@/lib/supabase/server`; escrita em Server Actions (`src/features/<módulo>/actions.ts`) validadas com zod. Proteja páginas/actions com `requireStaff()` / `requireAdmin()` de `@/lib/auth`.
- Organização por módulo em `src/features/<módulo>/` (actions, queries, schemas, components). Shell e componentes compartilhados em `src/components/{shell,feedback,brand,ui}`.
- Dinheiro em centavos (`*_cents`), formatado só na tela (`formatBRL`). Datas: `formatDate` (dd/mm/aaaa), "hoje" sempre em `America/Sao_Paulo` (`app.today_sp()` no banco).
- Telefones guardados só com dígitos e DDD (10–11). WhatsApp por link `https://wa.me/55<numero>`.
- Integrações futuras atrás de interfaces em `src/integrations/` (NotificationChannel, PaymentProvider).

## UX (requisito, não acabamento)
- Mobile-first: testar 375, 768 e 1024px. Celular: barra inferior (admin: Tarefas·Agenda·Alunos·Financeiro·Mais; personal: Agora·Agenda·Alunos·Conta). md+: trilho lateral.
- Tela inicial: admin → `/tarefas`; personal → `/agora`.
- Alvos de toque ≥ 44px (`h-tap`), ação principal 52px (`h-tap-lg`, `size="lg"`). Ações principais na metade de baixo da tela.
- Ações reversíveis: aviso curto com **Desfazer** (`toastWithUndo`). Confirmação só para excluir/cancelar.
- Estados: skeleton no carregamento, `EmptyState` com orientação e ação, erros em português dizendo o que fazer.
- Tom próximo, sem jargão ("Tudo em dia por hoje.", "Peça ao Gabriel para redefinir").

## Tokens de design (`src/app/globals.css`)
- Cores sempre por token (`bg-brand`, `text-brand-ink`, `bg-success-soft`…), nunca hex solto nos componentes.
- `--brand` #F05B2A (extraído do logo) é para **fundo** de botão/destaque e título grande; texto sobre ele é preto (`--brand-foreground`). Laranja como **texto**: `text-brand-ink` (#B93E12 no claro, #F05B2A no escuro).
- Títulos: Barlow Condensed bold, caixa alta (`font-display`). Texto: Barlow.
- Telas sem menu (login, primeiro acesso) usam sempre o tema escuro (`className="dark"`).

## Ao fim de cada fase
1. `npm test && npm run test:rls && npm run test:e2e && npm run build`
2. `PRINTS_PHASE=fase-N npm run prints` e revisar contra "Experiência de uso" do PEDIDO; corrigir.
3. Resumo + como testar; commit.
