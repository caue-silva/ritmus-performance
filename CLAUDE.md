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
npm run db:start      # sobe o Supabase local (Docker Desktop aberto; se `docker` não estiver no PATH: export PATH="$HOME/.docker/bin:$PATH")
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
O seed imprime o link de cadastro do pré-cadastro "Carolina Dias" (para testar o formulário público).

## Banco e segurança (crítico)
- Toda mudança de schema = nova migration em `supabase/migrations/` (nunca editar uma já aplicada em produção). Depois: `npm run db:reset && npm run db:types`.
- **RLS em toda tabela**, políticas em `*_rls.sql` (ou na migration da tabela nova, com o mesmo padrão). `anon` não acessa nada.
- Helpers de política ficam no schema `app` (não exposto): `app.is_admin()`, `app.is_staff()`, `app.owns_student()`, `app.owns_slot()`, `app.owns_session()`. Use `(select app.is_admin())` nas políticas.
- **Financeiro só para admin.** Colunas de dinheiro vivem apenas em `student_billing`, `charges`, `charge_events`, `studio_settings`. Nunca adicionar coluna financeira em tabela legível por personal, nem criar view/RPC acessível ao personal que junte essas tabelas. Nenhuma tela, badge ou contador pode revelar ao personal se um aluno está em dia.
- PAR-Q/saúde (`student_health`): personal lê só dos próprios alunos; dono de horário **não** vê saúde de aluno de reposição.
- Regras de negócio que importam (capacidade 4, um horário por vez, ativação exige liberação médica, quem pode mudar status) são garantidas por **constraint/trigger no banco**, com mensagem de erro em pt-BR — a UI só repete a regra.
- Service role: só `src/lib/supabase/admin.ts` (`server-only`), e só para contas da equipe e o formulário público por token. Sempre checar permissão de quem chamou antes.
- Operações com várias escritas que precisam ser atômicas viram função SQL (`activate_student`, `release_student`, `submit_signup`). `SECURITY INVOKER` + checagem `app.is_admin()` quando é ação do admin; `SECURITY DEFINER` só para o fluxo público, com `grant` apenas para `service_role`.
- Agenda sem cron: `ensure_sessions(de, até)` cria aulas e presenças "previsto" sob demanda (idempotente) — chame antes de ler aulas (`getSessions` já faz). Vagas pela view `session_occupancy`. Lista da aula só por `session_roster` (mostra nome de aluno de reposição de outro personal, sem dados de saúde). Feriado = linha em `closures` (trigger marca as aulas).
- Dentro de função `SECURITY DEFINER`, `current_user` é o dono da função: para saber se é o servidor use `auth.jwt() ->> 'role' = 'service_role'`, não `app.is_privileged()`.
- Tarefas da Central = view `admin_tasks` (derivada, filtrada por `app.is_admin()`). Tarefa nova = novo `union all` na view, nunca tabela de tarefas.
- Formulário público (`/cadastro/[token]`): sem login; o servidor valida o hash do token e grava com a chave secreta. Validação compartilhada em `src/features/cadastro/schema.ts`.
- Fotos da equipe: bucket público `avatars` no Supabase Storage, pasta `<id do perfil>/`; o personal grava só na própria pasta, o admin em qualquer uma. Redimensionar no aparelho antes de enviar. Exames e outros arquivos de aluno continuam fora do sistema.
- Todo teste novo de permissão vai em `tests/rls/`.

## Código
- Identificadores em inglês (tabelas, funções, componentes); rotas e textos da interface em pt-BR (`/alunos`, `/financeiro`).
- Leitura em Server Components com `createClient()` de `@/lib/supabase/server`; escrita em Server Actions (`src/features/<módulo>/actions.ts`) validadas com zod. Proteja páginas/actions com `requireStaff()` / `requireAdmin()` de `@/lib/auth`.
- Organização por módulo em `src/features/<módulo>/` (actions, queries, schemas, components). Shell e componentes compartilhados em `src/components/{shell,feedback,form,brand,ui}`.
- Server actions devolvem `{ ok: true, data } | { ok: false, message, fieldErrors }` (nunca lançam erro para a UI). Erros de zod com `fieldErrors()` de `@/lib/form-errors` (primeiro erro de cada campo). Erros do banco com `errcode P0001/42501` já vêm em pt-BR e podem ir direto para a tela.
- Campos: `TextField`/`MoneyField`/`ChipToggle`/`YesNo`/`CheckRow` de `@/components/form/fields`, máscaras e validações BR em `@/lib/validation`. Painéis de ação: `ActionSheet` (sobe de baixo no celular, lateral no md+).
- WhatsApp: `whatsappLink()`/`fillTemplate()` de `@/lib/whatsapp`; envio ao aluno passa por `NotificationChannel` (`src/integrations/notifications`).
- Dinheiro em centavos (`*_cents`), formatado só na tela (`formatBRL`). Datas: `formatDate` (dd/mm/aaaa), "hoje" sempre em `America/Sao_Paulo` (`app.today_sp()` no banco).
- Telefones guardados só com dígitos e DDD (10–11). WhatsApp por link `https://wa.me/55<numero>`.
- Integrações futuras atrás de interfaces em `src/integrations/` (NotificationChannel, PaymentProvider).

## UX (requisito, não acabamento)
- Mobile-first: testar 375, 768 e 1024px. Celular: barra inferior (admin: Tarefas·Agenda·Alunos·Financeiro·Mais; personal: Agora·Agenda·Alunos·Conta). md+: trilho lateral.
- Tela inicial: admin → `/tarefas`; personal → `/agora`.
- Alvos de toque ≥ 44px (`h-tap`), ação principal 52px (`h-tap-lg`, `size="lg"`). Ações principais na metade de baixo da tela.
- Ações reversíveis: aviso curto com **Desfazer** (`toastWithUndo`) e remoção otimista do item. Só um aviso visível por vez (`visibleToasts={1}`): empilhados, cobriam os botões de baixo. Confirmação só para excluir/cancelar/liberar vaga.
- Ação principal flutuante no celular (ex.: "Novo aluno") fica acima da barra inferior; listas embaixo dela ganham `mb-20 md:mb-0`.
- `devIndicators: false` no next.config: o indicador do modo dev cobria botões no canto inferior.
- Estados: skeleton no carregamento, `EmptyState` com orientação e ação, erros em português dizendo o que fazer.
- Tom próximo, sem jargão ("Tudo em dia por hoje.", "Peça ao Gabriel para redefinir").

## Tokens de design (`src/app/globals.css`)
- Cores sempre por token (`bg-brand`, `text-brand-ink`, `bg-success-soft`…), nunca hex solto nos componentes.
- `--brand` #F05B2A (extraído do logo) é para **fundo** de botão/destaque e título grande; texto sobre ele é preto (`--brand-foreground`). Laranja como **texto**: `text-brand-ink` (#B93E12 no claro, #F05B2A no escuro).
- Títulos: Barlow Condensed bold, caixa alta (`font-display`). Texto: Barlow.
- Telas sem menu (login, primeiro acesso) usam sempre o tema escuro (`className="dark"`).

## Testes
- Playwright roda com `reducedMotion: "reduce"` (sem rolagem suave/animações: cliques estáveis e prints nítidos).
- Testes E2E que mudam dados criam os próprios registros (nome com TAG) e limpam no `afterAll`, ou desfazem o que fizeram.
- O seed espera o Supabase responder depois do `db reset` (os serviços reiniciam).

## Ao fim de cada fase
1. `npm test && npm run test:rls && npm run test:e2e && npm run build`
2. `PRINTS_PHASE=fase-N npm run prints` e revisar contra "Experiência de uso" do PEDIDO; corrigir.
3. Resumo + como testar; commit.
