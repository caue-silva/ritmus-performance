-- Row Level Security de todas as tabelas, num só lugar para facilitar a revisão.
--
-- Regras:
--   * anon (sem login) não acessa nada. O formulário público passa pelo servidor.
--   * admin: tudo.
--   * personal: só os próprios horários e alunos; nada financeiro.
--   * Tabelas sem política para personal = invisíveis para ele.

-- Defesa extra: anon não tem nenhum privilégio em tabelas do schema public.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- Helpers do schema app: só usuários logados (e o servidor) executam.
revoke all on all functions in schema app from public, anon;
grant execute on all functions in schema app to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.studio_settings enable row level security;
alter table public.agenda_settings enable row level security;
alter table public.business_hours enable row level security;
alter table public.closures enable row level security;
alter table public.legal_documents enable row level security;
alter table public.students enable row level security;
alter table public.student_health enable row level security;
alter table public.student_billing enable row level security;
alter table public.student_invites enable row level security;
alter table public.consents enable row level security;
alter table public.time_slots enable row level security;
alter table public.enrollments enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendances enable row level security;
alter table public.measurements enable row level security;
alter table public.charges enable row level security;
alter table public.charge_events enable row level security;

-- ---------------------------------------------------------------------------
-- Equipe
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using ((select app.is_staff()) or id = (select auth.uid()));
-- O próprio perfil é legível mesmo desativado, para o app mostrar "conta desativada".
create policy profiles_update on public.profiles for update to authenticated
  using ((select app.is_admin()) or (id = (select auth.uid()) and (select app.is_staff())))
  with check ((select app.is_admin()) or (id = (select auth.uid()) and (select app.is_staff())));
-- insert/delete de perfis: só pelo servidor (service role ignora RLS).

-- ---------------------------------------------------------------------------
-- Configurações
-- ---------------------------------------------------------------------------
create policy studio_settings_admin on public.studio_settings for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

create policy agenda_settings_select on public.agenda_settings for select to authenticated
  using ((select app.is_staff()));
create policy agenda_settings_admin on public.agenda_settings for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

create policy business_hours_select on public.business_hours for select to authenticated
  using ((select app.is_staff()));
create policy business_hours_admin on public.business_hours for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

create policy closures_select on public.closures for select to authenticated
  using ((select app.is_staff()));
create policy closures_admin on public.closures for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

create policy legal_documents_select on public.legal_documents for select to authenticated
  using ((select app.is_staff()));
create policy legal_documents_insert on public.legal_documents for insert to authenticated
  with check ((select app.is_admin()));

-- ---------------------------------------------------------------------------
-- Alunos
-- ---------------------------------------------------------------------------
create policy students_select on public.students for select to authenticated
  using ((select app.is_admin()) or app.owns_student(id));
create policy students_update on public.students for update to authenticated
  using ((select app.is_admin()) or app.owns_student(id))
  with check ((select app.is_admin()) or personal_id = (select auth.uid()));
create policy students_insert on public.students for insert to authenticated
  with check ((select app.is_admin()));
create policy students_delete on public.students for delete to authenticated
  using ((select app.is_admin()));

-- Saúde: personal só lê, e só dos próprios alunos.
create policy student_health_select on public.student_health for select to authenticated
  using ((select app.is_admin()) or app.owns_student(student_id));
create policy student_health_admin on public.student_health for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

-- Financeiro do aluno, convites e consentimentos: só admin.
create policy student_billing_admin on public.student_billing for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));
create policy student_invites_admin on public.student_invites for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));
create policy consents_admin on public.consents for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

-- ---------------------------------------------------------------------------
-- Agenda
-- ---------------------------------------------------------------------------
create policy time_slots_select on public.time_slots for select to authenticated
  using ((select app.is_admin()) or app.owns_slot(id));
create policy time_slots_admin on public.time_slots for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

create policy enrollments_select on public.enrollments for select to authenticated
  using ((select app.is_admin()) or app.owns_slot(time_slot_id) or app.owns_student(student_id));
create policy enrollments_admin on public.enrollments for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

create policy class_sessions_select on public.class_sessions for select to authenticated
  using ((select app.is_admin()) or app.owns_session(id));
create policy class_sessions_update on public.class_sessions for update to authenticated
  using ((select app.is_admin()) or app.owns_session(id))
  with check ((select app.is_admin()) or personal_id = (select auth.uid()));
create policy class_sessions_admin on public.class_sessions for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

-- Presenças: o dono da aula faz check-in/falta e registra reposição nas aulas dele.
-- O personal do aluno enxerga o histórico do próprio aluno (inclusive reposições com outro).
create policy attendances_select on public.attendances for select to authenticated
  using ((select app.is_admin()) or app.owns_session(session_id) or app.owns_student(student_id));
create policy attendances_insert on public.attendances for insert to authenticated
  with check ((select app.is_admin()) or (app.owns_session(session_id) and created_by = (select auth.uid())));
create policy attendances_update on public.attendances for update to authenticated
  using ((select app.is_admin()) or app.owns_session(session_id))
  with check ((select app.is_admin()) or app.owns_session(session_id));
create policy attendances_delete on public.attendances for delete to authenticated
  using ((select app.is_admin()) or (app.owns_session(session_id) and kind = 'reposicao'));

-- ---------------------------------------------------------------------------
-- Evolução
-- ---------------------------------------------------------------------------
-- Personal mede os próprios alunos e, na aula dele, alunos de reposição.
-- Lê as medições dos próprios alunos e as que ele mesmo registrou.
create policy measurements_select on public.measurements for select to authenticated
  using ((select app.is_admin()) or app.owns_student(student_id)
         or (created_by = (select auth.uid()) and (select app.is_staff())));
create policy measurements_insert on public.measurements for insert to authenticated
  with check ((select app.is_admin())
              or (created_by = (select auth.uid())
                  and (app.owns_student(student_id) or app.can_measure_in_session(session_id, student_id))));
create policy measurements_update on public.measurements for update to authenticated
  using ((select app.is_admin()) or app.owns_student(student_id)
         or (created_by = (select auth.uid()) and (select app.is_staff())))
  with check ((select app.is_admin()) or app.owns_student(student_id)
              or (created_by = (select auth.uid()) and app.can_measure_in_session(session_id, student_id)));
create policy measurements_delete on public.measurements for delete to authenticated
  using ((select app.is_admin()) or app.owns_student(student_id)
         or (created_by = (select auth.uid()) and (select app.is_staff())));

-- ---------------------------------------------------------------------------
-- Financeiro: somente admin
-- ---------------------------------------------------------------------------
create policy charges_admin on public.charges for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));
create policy charge_events_select on public.charge_events for select to authenticated
  using ((select app.is_admin()));
-- charge_events é escrito apenas pelo trigger (security definer).
