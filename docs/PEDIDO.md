# Projeto: Sistema de gestão do Ritmus Performance

## Contexto
O Ritmus Performance é um estúdio de musculação e treinamento personalizado em Pilar do Sul (SP), do personal Gabriel Paiva. Atende em turmas pequenas: no máximo 4 alunos por horário. Equipe: Gabriel (dono, também dá aula) + 2 personais.

Quero um web app pensado primeiro para celular e tablet (os personais usam durante a aula, em pé, muitas vezes com uma mão só) que cubra: cadastro de alunos, agenda, registro de evolução, financeiro e cobrança.

A prioridade é simplicidade: menos peças móveis, menos integrações externas, e uma experiência de uso excelente.

## Pasta do projeto
- O projeto fica em ~/Desktop/Ritmus. Crie o app nessa mesma pasta.
- A pasta já contém:
  - docs/PEDIDO.md (este arquivo)
  - Logo/ (com o logo do estúdio, ver "Identidade visual")
- Não apague nem mova esses arquivos.
- Se o gerador do Next.js recusar a pasta por não estar vazia, gere o projeto em uma pasta temporária e mova os arquivos para cá.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase: Postgres, Auth e Row Level Security
- Recharts para gráficos
- Deploy na Vercel
- PWA (instalável na tela inicial do celular)
- Playwright para prints de revisão das telas
- Tudo em pt-BR, moeda BRL, fuso America/Sao_Paulo, datas dd/mm/aaaa

## Fora do escopo nesta versão
Não implementar, mas deixar a arquitetura pronta para entrar depois:
- envio de e-mails (nenhum e-mail é enviado pelo sistema)
- rotinas agendadas (cron)
- gateway de pagamento
- WhatsApp Cloud API (o WhatsApp é usado apenas por links wa.me)
- upload e armazenamento de exames
- portal do aluno com login

## Identidade visual
O logo está em ~/Desktop/Ritmus/Logo, no arquivo "Logo Ritmus". O nome tem espaço; verifique a extensão. É um print de tela do logo, não o arquivo original. Por isso:
- recorte apenas o logo circular e remova o fundo branco ao redor, deixando o fundo transparente;
- salve a versão tratada em /public/logo-ritmus.png e use essa cópia no projeto;
- gere a partir dela o favicon e os ícones do PWA (192px e 512px);
- a resolução do print é baixa: se os ícones ou o logo ficarem borrados em telas maiores, me avise, porque vou pedir o arquivo original ao Gabriel;
- deixe a troca do arquivo de logo simples, sem precisar mexer no código.

Cores:
- laranja da marca: extraia a cor exata do logo (aproximadamente #E2673C)
- preto e branco

Visual forte e esportivo. Títulos em sans-serif bold condensada (ex.: Oswald ou Barlow Condensed) e texto corrido legível. Suporte a modo claro e escuro.

## Experiência de uso (prioridade alta)
A UX é um requisito central, não um acabamento. Os personais usam o sistema no meio da aula, e o Gabriel usa entre um aluno e outro. Cada toque a mais pesa.

- Tarefas frequentes em no máximo 2 a 3 toques: abrir o horário atual, fazer check-in, registrar medição, confirmar pagamento e cobrar no WhatsApp.
- Tela inicial por perfil:
  - personal abre direto no "Agora": o horário em andamento (ou o próximo) com os alunos e os botões de check-in e medição
  - Gabriel abre na Central de tarefas (ver seção própria)
- Uso com uma mão: navegação inferior com 4 ou 5 itens no celular e ações principais na metade de baixo da tela.
- Feedback imediato:
  - interface otimista e avisos curtos de sucesso
  - ações reversíveis (check-in, confirmar pagamento) oferecem "Desfazer" em vez de "Tem certeza?"
  - confirmação só para ações destrutivas, como excluir ou cancelar
- Busca rápida de aluno, acessível de qualquer tela.
- Estados bem resolvidos:
  - carregamento com skeletons
  - estados vazios com orientação e ação (ex.: "Nenhum aluno ainda. Envie o primeiro link de cadastro.")
  - erros em português claro, dizendo o que fazer
- Linguagem próxima e sem jargão técnico, como o Gabriel falaria com o aluno.
- Acessibilidade:
  - contraste mínimo AA
  - o laranja da marca não tem contraste suficiente para texto pequeno sobre fundo branco, então use-o em botões, destaques e títulos grandes, e um tom mais escuro quando for texto
  - alvos de toque de pelo menos 44px e foco visível
- Consistência visual: tokens de design (cores, espaçamentos, raios, tipografia) definidos uma vez e reaproveitados em todas as telas. Transições curtas e discretas.

## Perfis, acesso e permissões (crítico: aplicar via RLS no banco, não só na interface)
É um único app, com o mesmo login, e o menu se adapta ao perfil.

- Admin (Gabriel):
  - tem tudo o que o personal tem, porque também dá aula e tem a própria agenda e os próprios alunos
  - acesso total, incluindo financeiro, inadimplência, configurações e equipe
- Personal:
  - vê e edita apenas os horários em que é responsável e os alunos vinculados a ele
  - vê as respostas do PAR-Q e as observações de saúde apenas dos próprios alunos
  - não acessa nenhuma informação financeira: valores, status de pagamento ou inadimplência
  - nenhuma tela, badge ou indicador visível ao personal pode revelar se um aluno está em dia ou atrasado
- Aluno: sem login. Interage só pelo link do formulário de cadastro e recebe cobranças pelo WhatsApp.

Login sem envio de e-mail:
- Login por e-mail e senha no Supabase Auth, com confirmação de e-mail desativada.
- O Gabriel cria a conta de cada personal com uma senha temporária. O personal é obrigado a trocá-la no primeiro acesso.
- Se um personal esquecer a senha, o Gabriel redefine pela tela de Equipe.
- A criação e a redefinição de contas rodam no servidor com a service role key, nunca no navegador.

Escreva testes para as políticas RLS garantindo que:
- um personal não consegue ler nem editar dados de alunos de outro personal;
- um personal não consegue ler o PAR-Q de alunos de outro personal;
- um personal não consegue ler nenhuma tabela ou coluna financeira.

## Central de tarefas do Gabriel (tela inicial do admin)
É a tela mais importante para o Gabriel: ele abre o app e sabe exatamente o que precisa fazer no dia. As tarefas são geradas automaticamente pelo sistema:
- novo cadastro recebido, aguardando revisão e ativação;
- liberação médica pendente (aluno respondeu "sim" a alguma pergunta do PAR-Q);
- aluno sem valor de mensalidade definido;
- cobranças que vencem hoje;
- cobranças em atraso.

Comportamento:
- Cada tarefa mostra o essencial (aluno, motivo, valor e data quando houver) e traz a ação principal no próprio card: ativar, registrar liberação, definir valor, "Cobrar no WhatsApp" ou "Confirmar pagamento".
- A tarefa some quando é resolvida, com "Desfazer" disponível por alguns segundos.
- Contador de tarefas abertas na navegação.
- Estado vazio positivo quando não há nada pendente (ex.: "Tudo em dia por hoje.").

Layout por tela:
- celular: lista única ordenada por urgência (atrasados, vencendo hoje, cadastros e liberações, valores a definir), com filtros rápidos no topo;
- tablet e computador: colunas por tipo de tarefa, para ver tudo de uma vez, com o horário atual do Gabriel visível na lateral ou no topo.

## Módulos

### 1. Cadastro de alunos
- Ao fechar com um aluno, o admin cria um pré-cadastro (nome + WhatsApp) e o sistema gera um link único com token, que expira em 7 dias.
- O link é enviado por um botão de WhatsApp (abre wa.me com mensagem pronta).
- Formulário público, mobile, em etapas curtas, com barra de progresso e rascunho salvo automaticamente:
  - dados pessoais: nome, CPF, nascimento, telefone, e-mail (opcional) e endereço preenchido pelo CEP (ViaCEP)
  - contato de emergência
  - objetivos
  - altura e peso iniciais
  - dia de vencimento preferido da mensalidade
  - saúde (ver abaixo)
  - aceite dos termos e consentimento LGPD (registrar data, hora e versão do termo)
- Máscaras para CPF, telefone e data, o teclado certo para cada campo e validação no próprio campo.
- Depois do envio, o aluno fica "Aguardando ativação" e gera as tarefas correspondentes para o Gabriel.
- Na ativação, o admin define:
  - personal responsável
  - frequência semanal e horários fixos
  - valor mensal negociado (o vencimento já vem do cadastro e pode ser ajustado)
- Os valores são negociados caso a caso, então não existe tabela fixa de planos. Pode haver valores de referência por frequência (2x, 3x, 5x por semana) apenas como sugestão no campo.
- Não gerar cobranças para aluno sem valor definido.
- Status do aluno: aguardando, ativo, pausado (férias/lesão), inativo.

#### Saúde no cadastro (PAR-Q)
- Questionário PAR-Q com as 7 perguntas padrão, respostas sim ou não.
- Campo opcional de texto livre: "Tem algo que o seu personal deva saber? (dor, lesão, restrição)".
- Declaração obrigatória, com aceite registrado (data, hora e versão do texto). Texto provisório, que será validado juridicamente antes de ir ao ar:
  "Declaro que respondi o questionário acima com sinceridade, que fui orientado a buscar avaliação médica antes de iniciar atividade física e a manter meus exames de rotina atualizados, e que vou informar o personal sobre qualquer mudança no meu estado de saúde."
- O texto da declaração deve ficar em configuração, fácil de editar, com controle de versão.
- Se o aluno responder "sim" a qualquer pergunta do PAR-Q:
  - ele fica marcado como "requer liberação médica";
  - surge a tarefa correspondente para o Gabriel;
  - o aluno só pode ser ativado depois que o Gabriel registrar "liberação médica recebida em dd/mm" (sem upload de arquivo; o documento fica com o Gabriel).
- Não coletar outros dados de saúde além desses.

### 2. Agenda
- Horários de funcionamento configuráveis: dias da semana, abertura/fechamento e duração da aula.
- Cada horário tem um personal responsável e capacidade máxima de 4 alunos. Garantir a capacidade no banco (constraint ou trigger), não só na UI.
- O aluno tem horários fixos semanais conforme o combinado (ex.: seg/qua/sex às 7h). As aulas são geradas a partir disso.
- Exceções: falta, falta justificada, aula cancelada ou feriado.
- Reposição:
  - O aluno combina a falta ou a reposição diretamente com o personal, fora do sistema.
  - Só o personal registra a reposição, e apenas em horários dele mesmo que tenham vaga.
  - Não há prazo nem quantidade máxima de reposições.
  - Se a reposição for no horário de outro personal, os dois combinam entre si e quem registra é o dono do horário.
  - Guardar quem registrou e quando.
- Visualizações:
  - dia (padrão no celular)
  - semana (tablet/desktop)
  - indicador de vagas em cada horário (ex.: 3/4)
- Check-in de presença rápido na tela do horário.
- Na tela do aluno, um aviso discreto quando houver PAR-Q com "sim" ou observação de saúde, para o personal ver antes da aula.
- O admin vê a agenda de todos, com filtro por personal.

### 3. Evolução (registro por aula)
- Na tela do horário, o personal toca no aluno e registra peso (kg), cintura (cm), abdômen (cm) e observações.
- A altura fica no cadastro do aluno e pode ser atualizada quando necessário.
- Entrada rápida: teclado numérico, campos grandes, valores do último registro como referência, salvar com um toque.
- Tolerar sinal ruim: mostrar estado "envio pendente" e reenviar automaticamente.
- IMC calculado automaticamente.
- Histórico completo por aluno.

### 4. Gráficos e indicadores
- Por aluno:
  - linhas de peso, cintura, abdômen e IMC ao longo do tempo
  - filtro de período (30/90/180 dias/tudo)
  - variação desde o início (ex.: "-4,2 kg desde março")
- Frequência mensal de presença.
- Dashboard do admin: alunos ativos, ocupação dos horários (%), receita confirmada no mês x prevista, e inadimplência.

### 5. Financeiro e cobrança (somente admin)
Sem gateway, sem e-mail e sem rotina agendada: o sistema gera a cobrança, o Gabriel cobra pelo WhatsApp com um toque e confirma o recebimento manualmente.

- Geração das mensalidades sem cron: sempre que o admin abre o app, o servidor garante que as cobranças do mês corrente existem para todos os alunos ativos com valor definido. A operação deve ser idempotente (nunca duplicar uma cobrança).
- Cada cobrança usa o valor e o dia de vencimento do aluno.
- Configurações do estúdio: chave Pix, nome do recebedor e cidade.
- Cada cobrança gera um Pix copia e cola estático com o valor (BR Code no padrão EMV do Banco Central) e o QR Code correspondente, sem integração externa.
- Botão "Cobrar no WhatsApp" em cada cobrança, que abre wa.me com mensagem pronta (nome do aluno, valor, vencimento e Pix copia e cola). Mensagens diferentes para "vence hoje" e "em atraso", editáveis nas configurações.
- Confirmação manual pelo Gabriel em um toque, registrando data e forma de pagamento (Pix, dinheiro, cartão na maquininha, outro) e observação opcional.
- Também é possível cancelar ou ajustar o valor de uma cobrança específica, com registro de quem alterou.
- Status da cobrança: pendente, pago, vencido, cancelado.
- Deixar abstraídos o envio de notificações (ex.: interface NotificationChannel) e a emissão de cobrança (ex.: interface PaymentProvider), para plugar e-mail, WhatsApp Cloud API e gateway de pagamento depois sem refatorar.
- Relatórios: recebido x previsto por mês e lista de inadimplentes.

### 6. Equipe (admin)
- Criar conta de personal (nome, e-mail, WhatsApp e senha temporária).
- Ativar e desativar personais, redefinir senha e atribuir horários.

## Requisitos não funcionais
- Mobile-first: testar em 375px, 768px e 1024px.
- Segurança: RLS em todas as tabelas, service role key só no servidor, segredos em .env.local com um .env.example documentado.
- LGPD: permitir exportar e excluir os dados de um aluno.
- Migrations do Supabase versionadas no repositório.
- Seed com dados fictícios para testar agenda, gráficos, tarefas e financeiro:
  - 3 personais e ~20 alunos
  - 8 semanas de medições
  - alunos com mensalidade vencendo hoje e em atraso
  - um aluno sem valor definido
  - um aluno com "sim" no PAR-Q aguardando liberação médica

## Como quero que você trabalhe
1. Antes de escrever código, me devolva:
   - modelo de dados (tabelas, relações e políticas RLS)
   - mapa de telas com os fluxos principais de cada perfil
   - estrutura de pastas e plano por fases
   - uma lista de dúvidas e premissas

   Espere minha aprovação.
2. Implemente por fases, cada uma testável ao final:
   - Fase 1: setup, autenticação, perfis, RLS, tratamento do logo, tokens de design e layout com a identidade visual
   - Fase 2: alunos, formulário de cadastro com PAR-Q, Central de tarefas e Equipe
   - Fase 3: agenda, presença e reposições
   - Fase 4: medições e gráficos
   - Fase 5: financeiro, Pix copia e cola, cobrança pelo WhatsApp e confirmação manual
   - Fase 6: PWA, dashboard e polimento
3. Ao fim de cada fase:
   - use o Playwright para tirar prints das telas novas em 375px, 768px e 1024px
   - revise a experiência com base na seção "Experiência de uso" e corrija o que não estiver bom
   - depois mostre o que foi feito, como testar e faça um commit
4. Crie um CLAUDE.md com as convenções do projeto e mantenha-o atualizado.
