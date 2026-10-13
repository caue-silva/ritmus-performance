-- Seed estático (roda no `supabase db reset`). Usuários e dados fictícios: scripts/seed.ts.

insert into public.studio_settings (pix_key, pix_receiver_name, pix_city, msg_invite, msg_due_today, msg_overdue, reference_fees)
values (
  'pix@ritmus.test',
  'RITMUS PERFORMANCE',
  'PILAR DO SUL',
  'Oi, {primeiro_nome}! Que bom ter você no Ritmus 💪 Para finalizar sua matrícula, preencha seu cadastro por este link (vale por 7 dias): {link}',
  'Oi, {primeiro_nome}! Passando para lembrar que sua mensalidade de {valor} vence hoje ({vencimento}). Se preferir, é só pagar pelo Pix copia e cola abaixo:

{pix}

Obrigado! 🧡',
  'Oi, {primeiro_nome}! Tudo bem? Notei que a mensalidade de {valor} com vencimento em {vencimento} ainda está em aberto. Segue o Pix copia e cola para facilitar:

{pix}

Se já pagou, é só me avisar que eu atualizo aqui. Obrigado!',
  '{"2": 28000, "3": 36000, "5": 50000}'
);

insert into public.agenda_settings (class_duration_min) values (60);

-- Seg a sex 6h–21h, sábado 8h–12h.
insert into public.business_hours (weekday, opens_at, closes_at) values
  (1, '06:00', '21:00'),
  (2, '06:00', '21:00'),
  (3, '06:00', '21:00'),
  (4, '06:00', '21:00'),
  (5, '06:00', '21:00'),
  (6, '08:00', '12:00');

insert into public.legal_documents (kind, version, body) values
(
  'declaracao_saude', 1,
  'Declaro que respondi o questionário acima com sinceridade, que fui orientado a buscar avaliação médica antes de iniciar atividade física e a manter meus exames de rotina atualizados, e que vou informar o personal sobre qualquer mudança no meu estado de saúde.'
),
(
  'termos', 1,
  '[TEXTO PROVISÓRIO — será validado juridicamente antes de ir ao ar]

Ao me matricular no Ritmus Performance, concordo em seguir as orientações do personal durante os treinos, avisar com antecedência quando não puder comparecer e manter a mensalidade em dia na data de vencimento combinada. As reposições de aula são combinadas diretamente com o personal, conforme disponibilidade de horários.'
),
(
  'lgpd', 1,
  '[TEXTO PROVISÓRIO — será validado juridicamente antes de ir ao ar]

Autorizo o Ritmus Performance a guardar e usar meus dados pessoais e de saúde informados neste cadastro somente para organizar meus treinos, acompanhar minha evolução, entrar em contato comigo e fazer a cobrança das mensalidades. Meus dados não serão compartilhados com terceiros. Posso pedir a qualquer momento uma cópia dos meus dados ou a exclusão deles.'
);
