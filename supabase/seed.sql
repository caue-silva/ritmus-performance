-- Seed de DESENVOLVIMENTO (roda só no `supabase db reset`). Os dados iniciais reais
-- estão na migration *_initial_data.sql. Usuários e dados fictícios: scripts/seed.ts.

update public.studio_settings set
  pix_key = 'pix@ritmus.test',
  pix_key_type = 'email',
  pix_receiver_name = 'RITMUS PERFORMANCE',
  pix_city = 'PILAR DO SUL',
  reference_fees = '{"2": 28000, "3": 36000, "5": 50000}'
where id = true;
