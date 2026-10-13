# Ritmus Performance — Plano técnico (item 1 do PEDIDO)

> Status: **aprovado** em 12/10/2026, com as respostas da seção 6. Fases 1 a 6 implementadas. Publicação: `docs/DEPLOY.md`.

---

## 0. Decisões de base

| Tema | Decisão |
|---|---|
| Nomes no código/banco | Inglês (`students`, `charges`). Rotas e textos da interface em pt-BR (`/alunos`, `/financeiro`). |
| Escrita de dados | Server Actions do Next.js com o cliente Supabase do usuário logado (RLS vale sempre). Service role **só** em `src/lib/supabase/admin.ts` (`server-only`), usada em: criar/redefinir conta de personal, formulário público de cadastro. |
| Acesso anônimo | Nenhuma política para `anon`. O formulário público fala só com o servidor, que valida o token. |
| "Hoje" | Sempre calculado no fuso `America/Sao_Paulo` (função SQL `today_sp()` e helper TS). |
| Dinheiro | Inteiro em centavos (`amount_cents`). Formatação BRL só na tela. |
| Tarefas da Central | **Não são uma tabela**: são uma view derivada do estado (cadastros, PAR-Q, cobranças). Resolver a causa faz a tarefa sumir sozinha — sem sincronização, sem cron. |
| Sem cron | Cobranças do mês e aulas da agenda são criadas sob demanda por funções idempotentes (`ensure_*`), chamadas pelo servidor quando a tela abre. Unicidade garantida por constraint. |
| Gerenciador de pacotes | npm (pnpm não está instalado). |

---

## 1. Modelo de dados

### 1.1 Enums

- `staff_role`: `admin`, `personal`
- `student_status`: `convidado` (link enviado, formulário não preenchido), `aguardando`, `ativo`, `pausado`, `inativo`
- `session_status`: `normal`, `cancelada`, `feriado`
- `attendance_kind`: `fixo`, `reposicao`
- `attendance_status`: `previsto`, `presente`, `falta`, `falta_justificada`
- `charge_status` (gravado): `pendente`, `pago`, `cancelado` — **"vencido" é calculado** (`pendente` e `due_date < today_sp()`), assim não precisa de rotina para virar o status.
- `payment_method`: `pix`, `dinheiro`, `cartao`, `outro`
- `legal_doc_kind`: `termos`, `lgpd`, `declaracao_saude`

### 1.2 Tabelas

**Equipe e configuração**

| Tabela | Colunas principais | Observações |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `full_name`, `email`, `whatsapp`, `role`, `active`, `must_change_password`, `created_at` | Um por membro da equipe. Criado só pelo servidor. |
| `studio_settings` (1 linha) | `pix_key`, `pix_receiver_name`, `pix_city`, `msg_invite`, `msg_due_today`, `msg_overdue`, `reference_fees` (jsonb `{ "2": 30000, "3": 40000, "5": 55000 }`) | **Financeiro → só admin.** |
| `agenda_settings` (1 linha) | `class_duration_min` | Leitura para a equipe. |
| `business_hours` | `weekday` (0–6), `opens_at`, `closes_at` | Define a grade de horários possíveis. |
| `closures` | `date`, `reason` | Feriados/estúdio fechado → aulas do dia viram `feriado`. |
| `legal_documents` | `kind`, `version`, `body`, `created_by`, `created_at` | Editar = criar nova versão. Unique (`kind`, `version`). A versão vigente é a maior. |

**Alunos**

| Tabela | Colunas principais | Observações |
|---|---|---|
| `students` | `id`, `personal_id` → profiles (null até ativar), `status`, `full_name`, `whatsapp`, `cpf`, `birth_date`, `email`, `cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `emergency_name`, `emergency_phone`, `emergency_relation`, `goals`, `height_cm`, `weekly_frequency`, `submitted_at`, `activated_at`, `activated_by`, `created_by`, `created_at` | **Nenhuma coluna financeira aqui.** CPF unique (quando preenchido). |
| `student_health` | `student_id` (PK), `parq_answers` (7 booleanos), `health_notes`, `requires_clearance` (gerada: algum "sim"), `clearance_received_on` (date), `clearance_registered_by`, `clearance_registered_at` | Tabela separada para isolar dados sensíveis e testar o acesso de forma explícita. |
| `student_billing` | `student_id` (PK), `monthly_fee_cents` (null = sem valor), `due_day` (1–31; em meses curtos usa o último dia), `updated_by`, `updated_at` | **Financeiro → só admin.** O vencimento preferido do formulário cai aqui. |
| `student_invites` | `id`, `student_id`, `token_hash` (sha256; o token puro só existe no link), `expires_at` (+7 dias), `used_at`, `draft` (jsonb do rascunho), `created_by` | Rascunho salvo no servidor: funciona mesmo se o aluno abrir pelo navegador do WhatsApp e depois pelo Chrome. |
| `consents` | `student_id`, `legal_document_id`, `accepted_at`, `ip`, `user_agent` | Um registro por documento aceito (termos, LGPD, declaração de saúde) com a versão exata. |

**Agenda e presença**

| Tabela | Colunas principais | Observações |
|---|---|---|
| `time_slots` | `id`, `weekday`, `start_time`, `personal_id`, `capacity` (default 4, `CHECK capacity BETWEEN 1 AND 4`), `active` | O "horário" fixo semanal (ex.: seg 07:00 · Gabriel). |
| `enrollments` | `id`, `student_id`, `time_slot_id`, `starts_on`, `ends_on` | Horários fixos do aluno. **Trigger** com `SELECT … FOR UPDATE` no slot impede passar da capacidade. |
| `class_sessions` | `id`, `time_slot_id`, `date`, `personal_id` (cópia do slot), `status`, `status_reason`, `updated_by` | Aula concreta. Unique (`time_slot_id`, `date`). Criada sob demanda. |
| `attendances` | `id`, `session_id`, `student_id`, `kind`, `status`, `checked_in_at`, `checked_in_by`, `created_by`, `created_at` | Unique (`session_id`, `student_id`). **Trigger** de capacidade: alunos com status `previsto`/`presente` ≤ capacidade. Uma falta libera a vaga para reposição. Reposição guarda quem registrou e quando. |

**Evolução**

| Tabela | Colunas principais | Observações |
|---|---|---|
| `measurements` | `id`, `client_id` (uuid gerado no aparelho, unique), `student_id`, `session_id` (opcional), `measured_at`, `weight_kg`, `waist_cm`, `abdomen_cm`, `notes`, `height_cm` (cópia da altura no momento), `bmi` (coluna gerada), `created_by` | `client_id` torna o reenvio offline idempotente (`ON CONFLICT DO NOTHING`). |

**Financeiro**

| Tabela | Colunas principais | Observações |
|---|---|---|
| `charges` | `id`, `student_id`, `competence` (1º dia do mês), `amount_cents`, `due_date`, `status`, `paid_on`, `payment_method`, `payment_note`, `confirmed_by`, `canceled_reason` | **Unique (`student_id`, `competence`)** → a geração nunca duplica. |
| `charge_events` | `charge_id`, `action` (`criada`, `valor_ajustado`, `paga`, `pagamento_desfeito`, `cancelada`), `old_value`, `new_value`, `actor_id`, `at` | Histórico de quem alterou o quê. Preenchido por trigger. |

### 1.3 Relações

```
auth.users 1─1 profiles 1─N time_slots 1─N class_sessions 1─N attendances N─1 students
                    └──1─N students (personal responsável)
students 1─1 student_health · 1─1 student_billing · 1─N student_invites · 1─N consents
students 1─N enrollments N─1 time_slots
students 1─N measurements (N─1 class_sessions, opcional)
students 1─N charges 1─N charge_events
consents N─1 legal_documents
```

### 1.4 Funções, views e triggers

| Nome | Tipo | Quem pode chamar | O que faz |
|---|---|---|---|
| `is_admin()`, `is_staff()` | função `security definer` `stable` | todos | Base das políticas. `is_staff()` exige `profiles.active = true` → personal desativado perde todo acesso na hora. |
| `today_sp()` | função | todos | Data de hoje em São Paulo. |
| `ensure_monthly_charges()` | RPC `security definer` | só admin (checa `is_admin()`) | Cria a cobrança do mês para todo aluno `ativo` com valor definido. `ON CONFLICT DO NOTHING`. |
| `ensure_sessions(from, to)` | RPC `security definer` | equipe | Cria as aulas do período e as presenças `previsto` dos alunos fixos ativos — só dos horários que o chamador pode ver. Idempotente. |
| `session_roster(session_id)` | RPC `security definer` | dono do horário / admin | Lista da aula com nome, `is_mine` e alerta de saúde (ver pergunta 4). Permite mostrar o aluno de reposição de outro personal **sem** abrir a ficha dele. |
| `search_students_for_makeup(q)` | RPC `security definer` | equipe | Busca para reposição: devolve só `id` + nome de alunos ativos. |
| `admin_tasks` | view (`security_invoker`) | só admin | União de: cadastros aguardando, liberações pendentes, ativos sem valor, cobranças vencendo hoje, cobranças em atraso. Já vem com prioridade para ordenação. |
| `admin_dashboard(month)` | RPC | só admin | Alunos ativos, ocupação %, recebido × previsto, inadimplência. |
| `guard_student_update` | trigger | — | Impede quem não é admin de alterar `status` e `personal_id`. |
| `enforce_*_capacity` | triggers | — | Capacidade em `enrollments` e `attendances`, com lock de linha (sem condição de corrida). |
| `check_activation` | trigger | — | Bloqueia `status → ativo` se `requires_clearance` e `clearance_received_on` for nulo. |

### 1.5 Políticas RLS (todas as tabelas com RLS ligada)

"Meu aluno" = `students.personal_id = auth.uid()`. "Meu horário" = `class_sessions.personal_id = auth.uid()` (ou `time_slots.personal_id`).

| Tabela | Admin | Personal | Anônimo |
|---|---|---|---|
| `profiles` | ler e editar todos (criar/excluir: só servidor) | ler a equipe (nome); editar o próprio nome/WhatsApp | — |
| `studio_settings` | tudo | **—** | — |
| `agenda_settings`, `business_hours`, `closures` | tudo | ler | — |
| `legal_documents` | ler, criar versão | ler | — (servidor entrega o texto) |
| `students` | tudo | ler/editar **meus alunos** (sem mudar status/personal) | — |
| `student_health` | tudo | **ler** só de meus alunos | — |
| `student_billing` | tudo | **—** | — |
| `student_invites`, `consents` | tudo | — | — |
| `time_slots` | tudo | ler **meus horários** | — |
| `enrollments` | tudo | ler os dos meus horários e dos meus alunos | — |
| `class_sessions` | tudo | ler/atualizar (cancelar) **meus horários** | — |
| `attendances` | tudo | ler as dos meus horários e dos meus alunos; check-in, falta e **reposição só em meus horários** | — |
| `measurements` | tudo | ler/criar/editar de meus alunos | — |
| `charges`, `charge_events` | tudo | **—** | — |
| `admin_tasks`, `admin_dashboard` | sim | **—** (zero linhas / erro) | — |

Garantia de "nada financeiro para o personal": as colunas de dinheiro vivem só em `student_billing`, `charges`, `charge_events` e `studio_settings`, que não têm nenhuma política para personal. Nenhuma view/RPC acessível ao personal junta essas tabelas.

### 1.6 Testes de RLS

Vitest + `supabase-js` contra o Supabase local, logando com usuários reais do seed (admin, personal A, personal B) — testa o caminho completo JWT → PostgREST → RLS. Casos mínimos (os três do pedido + extras):

1. Personal A não lê nem edita aluno de B (select vazio; update afeta 0 linhas).
2. Personal A não lê `student_health` de aluno de B.
3. Personal não lê `student_billing`, `charges`, `charge_events`, `studio_settings`, `admin_tasks`; `ensure_monthly_charges()` e `admin_dashboard()` falham.
4. Personal não registra reposição em horário de outro; não passa da capacidade; não ativa aluno.
5. Personal desativado não lê nada.
6. Anônimo não lê nenhuma tabela.

---

## 2. Mapa de telas

### 2.1 Navegação

- **Celular:** barra inferior. **Tablet/computador:** trilho lateral com os mesmos itens.
- **Busca de aluno:** botão fixo no cabeçalho de todas as telas → abre folha de busca com o teclado já aberto (nome ou telefone). No personal, só aparecem os próprios alunos.

| Admin (Gabriel) | Personal |
|---|---|
| **Tarefas** (badge com nº abertas) · Agenda · Alunos · Financeiro · Mais | **Agora** · Agenda · Alunos · Conta |
| "Mais": Painel, Equipe, Configurações, Conta | — |

### 2.2 Rotas

Públicas
- `/login`
- `/primeiro-acesso` — troca obrigatória da senha temporária
- `/cadastro/[token]` — formulário em etapas · `/cadastro/[token]/pronto` · estado "link expirado" com orientação ("Peça um novo link ao Gabriel")

Equipe
- `/agora` — horário em andamento ou o próximo: lista de alunos com botão de check-in grande e toque no aluno → folha de medição. Home do personal.
- `/tarefas` — Central de tarefas. Home do admin. No topo, o cartão "Seu horário agora" (o Gabriel também dá aula).
- `/agenda` — dia (padrão no celular) / semana (tablet+); vagas "3/4" em cada horário; filtro por personal (admin).
- `/agenda/aula/[id]` — tela do horário: check-in, falta/falta justificada, "Adicionar reposição", medição, cancelar aula.
- `/alunos` — lista com filtro por status · `/alunos/novo` (admin: pré-cadastro)
- `/alunos/[id]` — abas: Resumo (dados + aviso discreto de saúde) · Evolução (gráficos + histórico) · Presença · Financeiro (só admin) · LGPD (exportar/excluir, só admin)
- `/financeiro` — cobranças do mês (filtros: atrasadas, hoje, pendentes, pagas) · `/financeiro/[id]` (QR Code, copia e cola, WhatsApp, confirmar, ajustar valor, cancelar, histórico) · `/financeiro/relatorios` (recebido × previsto, inadimplentes)
- `/painel` — dashboard do admin
- `/equipe` — personais: criar, ativar/desativar, redefinir senha, horários atribuídos
- `/configuracoes` — Estúdio e Pix · Funcionamento e horários · Feriados · Mensagens do WhatsApp · Valores de referência · Termos e declaração (versões)
- `/conta` — nome, senha, tema claro/escuro, sair

### 2.3 Fluxos principais (toques contados a partir do app aberto)

**Personal**
| Tarefa | Fluxo | Toques |
|---|---|---|
| Abrir horário atual | App abre em "Agora" | 0 |
| Check-in | Botão "Chegou" no aluno → aviso com **Desfazer** | 1 |
| Registrar medição | Toca no aluno → folha com teclado numérico, último valor como referência → **Salvar** | 2 |
| Falta / falta justificada | Toca no aluno → "Faltou" / "Faltou (justificada)" | 2 |
| Reposição | Agenda → horário → "Adicionar reposição" → busca → aluno | 3–4 (tarefa rara) |

**Admin**
| Tarefa | Fluxo | Toques |
|---|---|---|
| Ver o que fazer hoje | App abre em "Tarefas" | 0 |
| Cobrar no WhatsApp | Card → "Cobrar no WhatsApp" (abre wa.me pronto) | 1 |
| Confirmar pagamento | Card → "Confirmar pagamento" → folha com Pix e data de hoje já marcados → **Confirmar** (+ Desfazer) | 2 |
| Novo aluno | Alunos → "+" → nome e WhatsApp → "Enviar link no WhatsApp" | 3 |
| Ativar aluno | Card "Ativar" → folha: personal, horários (com vagas), valor (sugestão pela frequência), vencimento → **Ativar** | 2 + preenchimento |
| Registrar liberação médica | Card → data (hoje sugerido) → **Registrar** | 2 |
| Definir valor | Card → valor → **Salvar** | 2 |

**Aluno (sem login):** recebe link no WhatsApp → formulário em 7 etapas curtas (Você · Endereço · Emergência · Objetivos e medidas · Mensalidade · Saúde (PAR-Q + observação + declaração) · Termos e LGPD) → tela de confirmação.

### 2.4 Central de tarefas

- **Celular:** lista única por urgência — atrasadas → vencendo hoje → cadastros e liberações → valores a definir — com chips de filtro no topo (Todas · Cobranças · Cadastros · Saúde · Valores).
- **Tablet/computador:** colunas por tipo + horário atual do Gabriel no topo.
- Card: aluno, motivo, valor e data quando houver, ação principal à direita (alvo ≥ 44px).
- Vazio: "Tudo em dia por hoje." com ilustração/ícone discreto.

---

## 3. Identidade visual e tokens

- **Fontes:** Barlow Condensed (títulos, bold) + Barlow (texto). Mesma família, combina bem e carrega leve via `next/font`.
- **Cores (contraste medido):**
  - `--brand` #F05B2A (extraído do logo) — fundo de botões e destaques.
  - Texto sobre o laranja: **preto** (5,8:1 ✔). Branco sobre o laranja dá só 3,4:1 — falha para texto normal, então botão primário = laranja com texto preto, como o "RITMUS" do logo.
  - Laranja como texto no modo claro: **#B93E12** (5,6:1 sobre branco ✔). No modo escuro o laranja original serve como texto (5,8:1 sobre preto ✔).
- Tokens em CSS variables (`globals.css`) + tema do Tailwind/shadcn: cores semânticas (`--background`, `--foreground`, `--brand`, `--brand-text`, `--success`, `--warning`, `--danger`), raios, espaçamentos, alturas de toque (`--tap: 44px`, botões principais 52px), durações de transição (150/200ms, respeitando `prefers-reduced-motion`).
- **Logo:** script `npm run logo` (sharp) recorta o círculo, remove o fundo, gera `public/logo-ritmus.png`, favicon e ícones 192/512. Para trocar o logo: substituir o arquivo em `Logo/` e rodar o comando — nenhum código muda.
- ⚠️ **Já posso adiantar:** o print tem 294×288 px e o círculo ocupa ~260 px. O ícone de 512 px vai precisar de ~2× de ampliação e ficará borrado; em tela retina o logo fica nítido só até ~130 px de largura. Vale pedir o original ao Gabriel (SVG, PDF ou PNG ≥ 1024 px) já agora. Também: no favicon (32 px) o texto do logo não será legível — sugiro um favicon só com o círculo laranja e o boneco/barra, se houver versão assim.

---

## 4. Estrutura de pastas

```
Ritmus/
├─ CLAUDE.md                     convenções (criado na Fase 1 e mantido)
├─ docs/  PEDIDO.md · PLANO.md
├─ Logo/  Logo Ritmus.png        (original, intocado)
├─ public/  logo-ritmus.png · icons/ (favicon, 192, 512, maskable) · sw.js
├─ scripts/  process-logo.ts · seed.ts (cria usuários via Admin API + dados fictícios)
├─ supabase/  config.toml · migrations/*.sql (versionadas, uma por fase)
├─ tests/
│  ├─ rls/          políticas (Vitest + Supabase local)
│  ├─ unit/         BR Code Pix, datas/fuso, máscaras, IMC
│  └─ e2e/          Playwright: prints 375/768/1024 + fluxos críticos
└─ src/
   ├─ app/
   │  ├─ (public)/  login · primeiro-acesso · cadastro/[token]
   │  ├─ (app)/     layout (shell por perfil) · agora · tarefas · agenda · alunos · financeiro · painel · equipe · configuracoes · conta
   │  ├─ manifest.ts
   │  └─ globals.css (tokens)
   ├─ components/
   │  ├─ ui/        shadcn
   │  └─ shell/     BottomNav · SideRail · Header · StudentSearch · UndoToast · EmptyState · ErrorState · Skeletons
   ├─ features/     um diretório por módulo: alunos · cadastro · agenda · evolucao · financeiro · tarefas · equipe · configuracoes
   │                (cada um: actions.ts · queries.ts · schemas.ts (zod) · components/)
   ├─ integrations/
   │  ├─ notifications/  NotificationChannel (interface) · WhatsAppLinkChannel (wa.me)
   │  └─ payments/       PaymentProvider (interface) · StaticPixProvider (BR Code EMV + QR)
   └─ lib/
      ├─ supabase/  server.ts · client.ts · admin.ts (server-only, service role)
      ├─ auth.ts    getStaff() · requireAdmin()
      ├─ format/    brl · datas dd/mm/aaaa · cpf · telefone
      ├─ dates.ts   fuso America/Sao_Paulo
      ├─ viacep.ts
      └─ offline-queue.ts   fila de medições pendentes (IndexedDB) com reenvio automático
```

---

## 5. Plano por fases

Cada fase termina com: prints Playwright (375/768/1024) das telas novas → revisão contra "Experiência de uso" → correções → resumo + como testar → commit.

| Fase | Entrega | Como testar ao final |
|---|---|---|
| **1. Base** | Next.js + TS + Tailwind + shadcn; Supabase local; **todas as migrations do modelo com RLS** + funções auxiliares; testes de RLS; login, troca obrigatória de senha, middleware por perfil; logo tratado + ícones; tokens, fontes, tema claro/escuro; shell (barra inferior, trilho lateral, cabeçalho com busca); seed básico (admin + 3 personais); `CLAUDE.md`; `git init`. | `npm run test:rls` verde; logar como admin e personal e ver menus diferentes; primeiro acesso obriga trocar senha. |
| **2. Alunos** | Pré-cadastro + link com token + botão WhatsApp; formulário público em etapas (máscaras, ViaCEP, rascunho, PAR-Q, declaração, termos/LGPD versionados); lista e ficha do aluno; ativação; Central de tarefas (cadastros, liberação, valor); Equipe (criar, desativar, redefinir senha). | Fluxo completo: criar aluno → abrir link → preencher → tarefa aparece → registrar liberação → ativar. |
| **3. Agenda** | Configuração de funcionamento e horários; feriados; matrículas fixas; geração sob demanda das aulas; visão dia/semana com vagas; tela do horário; check-in com Desfazer; faltas; reposição; tela "Agora". | Check-in em 1 toque; tentar 5º aluno → bloqueado pelo banco; reposição só em horário próprio. |
| **4. Evolução** | Folha de medição rápida; fila offline com "envio pendente"; IMC; histórico; gráficos por aluno com período e variação; frequência mensal. | Medir com rede desligada (DevTools offline) → reenvia ao voltar; gráficos com 8 semanas do seed. |
| **5. Financeiro** | `ensure_monthly_charges` ao abrir o app (admin); lista de cobranças; BR Code + QR; "Cobrar no WhatsApp" (hoje × atraso); confirmar com Desfazer; ajustar/cancelar com histórico; relatórios; tarefas de cobrança; configurações de Pix e mensagens. | BR Code validado em teste unitário (CRC) e lido por app de banco; abrir o app 2× não duplica cobranças. |
| **6. Polimento** | PWA instalável (manifest + service worker do shell); Painel do admin; exportar/excluir dados (LGPD); revisão geral de acessibilidade, estados vazios/erros/skeletons; deploy na Vercel; seed completo. | Instalar no celular; Lighthouse PWA/acessibilidade; navegação completa em 375 px. |

---

## 6. Decisões (respostas de 12/10/2026)

1. **Capacidade:** um único horário por vez no estúdio, com um único personal e no máximo 4 alunos. No banco: índice único de `time_slots (weekday, start_time)` entre os ativos, `class_sessions` única por (`date`, `start_time`) e triggers de capacidade em `enrollments` e `attendances`.
2. **Ambiente:** Docker na máquina + Supabase CLI (instalado via Homebrew). Contas Supabase/Vercel do Cauê. Repositório: https://github.com/caue-silva/ritmus-performance (público → nenhum segredo no repositório).
3. **Primeira mensalidade:** mês cheio; a 1ª cobrança vence 7 dias após a primeira aula (confirmado); as seguintes seguem o dia de vencimento do aluno.
4. **Reposição com aluno de outro personal:** o dono do horário **não** vê o aviso de saúde (nem o PAR-Q), mas **pode registrar a medição** do aluno naquela aula (`app.can_measure_in_session`). Ele lê só as medições que ele mesmo registrou.
5. **Exclusão (LGPD):** anonimizar — apagar os dados pessoais e manter valores/datas para os relatórios (`students.anonymized_at`).
6. **Aluno pausado:** libera a vaga — as matrículas fixas são encerradas (`enrollments.ends_on`) e as presenças futuras previstas são removidas; ao reativar, escolhem-se os horários de novo.

Outras decisões da Fase 1:
- Cor da marca extraída do logo: **#F05B2A** (o print está em perfil Display P3; os valores do arquivo foram usados como sRGB para casar com o logo exibido no app). Laranja para texto no modo claro: #B93E12.
- `cacheComponents` do Next 16 desligado (app todo autenticado, dados por usuário via RLS).
- Cadastro público de contas desligado no Supabase Auth (`enable_signup = false`); contas só pelo servidor.

## 7. Premissas (sigo assim se você não disser o contrário)

- Existe o status extra **`convidado`** (link enviado, formulário ainda não preenchido), antes de `aguardando`.
- O link pode ser reenviado/gerado de novo após expirar; o Gabriel pode preencher o formulário junto com o aluno no próprio celular.
- Personal edita dados cadastrais dos próprios alunos (contato, endereço, altura), mas não muda status, personal responsável nem nada financeiro.
- Personal pode cancelar uma aula **dele**; feriados são só do admin. O admin pode registrar reposição em qualquer horário.
- Aluno sem check-in no dia **não** vira falta automaticamente: fica "sem registro" e não conta na frequência.
- Pausado e inativo não geram cobrança. Mudar o valor da mensalidade vale da próxima cobrança em diante (a pendente se ajusta manualmente).
- Vencimento aceita 1–31; em meses mais curtos usa o último dia.
- Pix estático com valor e identificador da cobrança (sem integração com banco); o pagamento continua sendo confirmado à mão.
- Textos de termos de uso e LGPD serão **provisórios**, marcados como tal, como a declaração de saúde.
- Medição pode ser registrada fora de aula (ex.: o Gabriel no balcão), sem vínculo com um horário.
- Deploy inicial no subdomínio `.vercel.app`; domínio próprio fica para depois.

---

## 8. Fase 7 — Repasses dos professores e campanhas (proposta, aguardando aprovação)

Pedido do Gabriel depois da demonstração. Decisões (13/10/2026): comissão sobre o que o aluno **pagou**; o professor vê **só o total do próprio repasse** (sem detalhe por aluno); a comissão fica com o **professor responsável** pelo aluno (reposição não divide); entregar **tudo junto**.

### Modelo de dados

| Tabela / coluna | O que guarda | Quem acessa |
|---|---|---|
| `staff_commission_rates` | professor, % (ex.: 65), vale a partir de (data) | só admin |
| `charges.personal_id` | professor do aluno no momento em que a mensalidade foi gerada (não muda se o aluno trocar de professor depois) | só admin (como já é a tabela) |
| `students.referred_by` | "quem trouxe o aluno" (professor) | admin edita; personal não altera |
| `campaigns` | título, texto, arte (imagem), link opcional, início, fim, e a opção "1ª mensalidade 100% para quem trouxe o aluno" | admin cria; equipe lê as do período |
| `staff_payouts` | repasse do mês marcado como pago: professor, mês, valor, data, forma, observação, quem marcou | só admin |
| `staff_awards` | selos: professor, mês, "Professor do mês", nº de aulas | equipe lê |
| `profiles.joins_ranking` | participa do ranking (padrão: personal sim, admin não) | admin edita |
| bucket `campaigns` | artes das campanhas (leitura pública, escrita só admin) | — |

Funções no banco (todas com teste de permissão):
- `payout_report(mês)` — admin: por professor, total recebido dos alunos dele no mês, %, comissão, bônus, total, status do repasse e a lista por aluno para conferência.
- `my_payout(mês)` — personal: **só o próprio total** (parcial durante o mês), quanto é bônus e se já foi pago. Nunca por aluno.
- `teaching_ranking(mês)` — equipe: aulas dadas por professor no mês (aula com ao menos 1 check-in). Nenhum dado financeiro.
- `ensure_monthly_awards()` — sem rotina agendada: ao abrir o app, fixa o selo dos meses já encerrados (idempotente).

### Regras de cálculo

1. **Base do repasse:** mensalidades **pagas dentro do mês** (data do pagamento), dos alunos de cada professor. O que o aluno pagou em atraso entra no mês em que pagou.
2. **Percentual:** o que valia na data do pagamento. Mudar o % vale dali em diante; meses passados não mudam.
3. **Bônus de indicação:** numa campanha com a opção ligada, aluno **ativado durante o período** e com "quem trouxe" marcado → a **1ª mensalidade** dele vai **100% para quem trouxe**, quando for paga (mesmo se depois do fim da campanha). Nessa mensalidade não há comissão normal para o professor do aluno.
4. **Professor do mês:** mais aulas dadas no mês; desempate pelo total de check-ins; empate total → todos ganham o selo. O selo é fixado quando o mês termina.

### Telas

**Admin**
- **Equipe:** no card de cada professor, "Comissão: 65%" (editar, com "vale a partir de"), "Participa do ranking" e os selos conquistados.
- **Financeiro → Repasses** (nova aba): mês a mês, um card por professor com recebido dos alunos dele, %, comissão, bônus, total, parte do estúdio, e **Marcar como pago** (data, forma, observação, com Desfazer); detalhe por aluno para conferir.
- **Novo aluno / Ativar aluno / ficha:** campo opcional "Quem trouxe o aluno".
- **Mais → Campanhas** (nova): criar/editar campanha com arte (enviada do celular; recorte 2:1), período, texto, link e a opção de bônus; prévia de como fica na tela do professor.
- **Painel:** ranking do mês e total de repasses do mês.

**Personal**
- **Agora:** banner das campanhas ativas no topo (até 3, deslizando).
- **Meu mês** (novo item na barra inferior, 5º): aulas dadas e posição no ranking, selos, campanhas ativas e **"Seu repasse de outubro: R$ X"** (parcial até o fim do mês, depois "a receber" ou "pago em dd/mm", com quanto é bônus).

### Premissas (sigo assim se não houver objeção)
- O Gabriel tem comissão 0% (os alunos dele são 100% do estúdio) e fica fora do ranking; dá para mudar na Equipe.
- Se quem trouxe o aluno não for o professor dele, quem trouxe fica com 100% da 1ª mensalidade.
- Mensalidade cancelada ou ajustada: vale o valor efetivamente pago.
- O repasse marcado como pago guarda o valor do momento; se depois entrar um pagamento atrasado daquele mês, aparece como "diferença a pagar".

### Entrega e testes
Uma fase, com o fluxo de sempre: testes de permissão (personal nunca vê % de outro professor, repasse de outro, nem detalhe por aluno), testes unitários do cálculo, E2E dos fluxos, prints em 375/768/1024, revisão de UX e commit.
