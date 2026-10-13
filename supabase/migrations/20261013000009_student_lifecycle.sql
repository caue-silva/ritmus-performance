-- Ativação, pausa e inativação do aluno, cada uma numa transação.
-- SECURITY INVOKER: rodam com as permissões de quem chama (só admin passa no RLS),
-- e as regras de capacidade/liberação continuam valendo pelos triggers.

create function public.activate_student(
  p_student_id uuid,
  p_personal_id uuid,
  p_weekly_frequency smallint,
  p_slot_ids uuid[],
  p_fee_cents integer,
  p_due_day smallint
) returns uuid[]
language plpgsql security invoker set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  if not app.is_admin() then
    raise exception 'Só o administrador pode ativar alunos.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.time_slots t
    where t.id = any (p_slot_ids) and (t.personal_id <> p_personal_id or not t.active)
  ) then
    raise exception 'Escolha só horários do personal responsável.' using errcode = 'P0001';
  end if;

  insert into public.student_billing (student_id, monthly_fee_cents, due_day)
  values (p_student_id, p_fee_cents, p_due_day)
  on conflict (student_id) do update
    set monthly_fee_cents = excluded.monthly_fee_cents, due_day = excluded.due_day, updated_by = auth.uid();

  update public.students
  set personal_id = p_personal_id,
      weekly_frequency = p_weekly_frequency,
      status = 'ativo',
      activated_at = now(),
      activated_by = auth.uid()
  where id = p_student_id;
  if not found then
    raise exception 'Aluno não encontrado.' using errcode = 'P0002';
  end if;

  with inserted as (
    insert into public.enrollments (student_id, time_slot_id, starts_on)
    select p_student_id, s, app.today_sp() from unnest(p_slot_ids) as s
    returning id
  )
  select coalesce(array_agg(id), '{}') into v_ids from inserted;

  return v_ids;
end $$;

-- Pausa ou inativa: libera a vaga nos horários fixos e tira o aluno das próximas aulas.
create function public.release_student(p_student_id uuid, p_status public.student_status)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Só o administrador pode mudar o status do aluno.' using errcode = '42501';
  end if;
  if p_status not in ('pausado', 'inativo') then
    raise exception 'Status inválido.' using errcode = 'P0001';
  end if;

  update public.students set status = p_status where id = p_student_id;
  if not found then
    raise exception 'Aluno não encontrado.' using errcode = 'P0002';
  end if;

  -- Matrículas que nem começaram somem; as vigentes terminam hoje.
  delete from public.enrollments
  where student_id = p_student_id and starts_on > app.today_sp();
  update public.enrollments set ends_on = app.today_sp()
  where student_id = p_student_id and (ends_on is null or ends_on > app.today_sp());

  delete from public.attendances a
  using public.class_sessions s
  where a.session_id = s.id and a.student_id = p_student_id
    and a.kind = 'fixo' and a.status = 'previsto' and s.date > app.today_sp();
end $$;

revoke all on function public.activate_student(uuid, uuid, smallint, uuid[], integer, smallint) from public, anon;
revoke all on function public.release_student(uuid, public.student_status) from public, anon;
grant execute on function public.activate_student(uuid, uuid, smallint, uuid[], integer, smallint) to authenticated;
grant execute on function public.release_student(uuid, public.student_status) to authenticated;
