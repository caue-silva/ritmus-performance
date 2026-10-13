-- Trocar os horários fixos de um aluno ativo (admin). Mantém os que continuam,
-- encerra os que saem (a partir de hoje) e cria os novos.

create function public.set_student_schedule(p_student_id uuid, p_slot_ids uuid[])
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_personal uuid;
begin
  if not app.is_admin() then
    raise exception 'Só o administrador muda os horários fixos.' using errcode = '42501';
  end if;
  select personal_id into v_personal from public.students where id = p_student_id and status = 'ativo';
  if not found then
    raise exception 'Só dá para mudar horários de aluno ativo.' using errcode = 'P0001';
  end if;

  -- Sai: matrícula futura é apagada; vigente termina hoje.
  delete from public.enrollments
  where student_id = p_student_id and starts_on > app.today_sp() and not (time_slot_id = any (p_slot_ids));
  update public.enrollments set ends_on = app.today_sp()
  where student_id = p_student_id and (ends_on is null or ends_on > app.today_sp())
    and not (time_slot_id = any (p_slot_ids));

  -- Tira o aluno das próximas aulas dos horários que saíram.
  delete from public.attendances a
  using public.class_sessions s
  where a.session_id = s.id and a.student_id = p_student_id and a.kind = 'fixo' and a.status = 'previsto'
    and s.date > app.today_sp() and not (s.time_slot_id = any (p_slot_ids));

  -- Entra: só os que ainda não estão vigentes.
  insert into public.enrollments (student_id, time_slot_id, starts_on)
  select p_student_id, s, app.today_sp()
  from unnest(p_slot_ids) as s
  where not exists (
    select 1 from public.enrollments e
    where e.student_id = p_student_id and e.time_slot_id = s and (e.ends_on is null or e.ends_on > app.today_sp())
  );
end $$;

revoke all on function public.set_student_schedule(uuid, uuid[]) from public, anon;
grant execute on function public.set_student_schedule(uuid, uuid[]) to authenticated;
