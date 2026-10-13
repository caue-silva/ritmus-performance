-- Fase 6: exclusão de dados pessoais (LGPD) por anonimização.
-- Apaga tudo o que identifica o aluno ou fala da saúde/corpo dele; mantém valores e
-- datas de mensalidades e presenças (sem nome) para os relatórios do estúdio.

create function public.anonymize_student(p_student_id uuid)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Só o administrador pode excluir dados de aluno.' using errcode = '42501';
  end if;
  if exists (select 1 from public.students where id = p_student_id and anonymized_at is not null) then
    raise exception 'Os dados deste aluno já foram excluídos.' using errcode = 'P0001';
  end if;

  -- Sai dos horários e das próximas aulas.
  delete from public.enrollments where student_id = p_student_id and starts_on > app.today_sp();
  update public.enrollments set ends_on = app.today_sp()
  where student_id = p_student_id and (ends_on is null or ends_on > app.today_sp());
  delete from public.attendances a using public.class_sessions s
  where a.session_id = s.id and a.student_id = p_student_id and s.date > app.today_sp();

  -- Dados de saúde e corpo.
  delete from public.student_health where student_id = p_student_id;
  delete from public.measurements where student_id = p_student_id;
  -- Link de cadastro (tinha o rascunho com dados pessoais).
  delete from public.student_invites where student_id = p_student_id;
  -- Mensalidades pendentes deixam de existir; pagas ficam (valores, sem nome).
  delete from public.charges where student_id = p_student_id and status <> 'pago';
  -- Aceites ficam como prova do consentimento, sem IP/navegador.
  update public.consents set ip = null, user_agent = null where student_id = p_student_id;

  update public.students set
    full_name = 'Aluno removido',
    whatsapp = '00000000000',
    cpf = null, birth_date = null, email = null,
    cep = null, street = null, number = null, complement = null, neighborhood = null, city = null, state = null,
    emergency_name = null, emergency_phone = null, emergency_relation = null,
    goals = '{}', goals_notes = null, height_cm = null,
    personal_id = null,
    status = 'inativo',
    anonymized_at = now()
  where id = p_student_id;
  if not found then
    raise exception 'Aluno não encontrado.' using errcode = 'P0002';
  end if;
end $$;

revoke all on function public.anonymize_student(uuid) from public, anon;
grant execute on function public.anonymize_student(uuid) to authenticated;
