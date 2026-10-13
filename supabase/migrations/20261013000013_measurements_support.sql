-- Fase 4: apoio às medições.

-- Lista da aula passa a trazer a data da última medição de cada aluno.
drop function public.session_roster(uuid);
create function public.session_roster(p_session_id uuid)
returns table (
  attendance_id uuid,
  student_id uuid,
  full_name text,
  kind public.attendance_kind,
  status public.attendance_status,
  checked_in_at timestamptz,
  is_mine boolean,
  owner_name text,
  health_flag boolean,
  created_by_name text,
  created_at timestamptz,
  last_measured_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_admin boolean := app.is_admin();
begin
  if not (v_admin or app.owns_session(p_session_id)) then
    raise exception 'Sem permissão para ver esta aula.' using errcode = '42501';
  end if;
  return query
  select a.id, st.id, st.full_name, a.kind, a.status, a.checked_in_at,
         (st.personal_id = auth.uid()) as is_mine,
         owner.full_name,
         case when v_admin or st.personal_id = auth.uid()
              then coalesce(h.requires_clearance, false) or coalesce(h.health_notes, '') <> ''
              else false end,
         creator.full_name,
         a.created_at,
         (select max(m.measured_at) from public.measurements m where m.student_id = st.id)
  from public.attendances a
  join public.students st on st.id = a.student_id
  left join public.profiles owner on owner.id = st.personal_id
  left join public.profiles creator on creator.id = a.created_by
  left join public.student_health h on h.student_id = st.id
  where a.session_id = p_session_id
  order by (a.status in ('falta', 'falta_justificada')), a.kind, st.full_name;
end $$;

revoke all on function public.session_roster(uuid) from public, anon;
grant execute on function public.session_roster(uuid) to authenticated;

-- Últimos valores do aluno, para servir de referência na hora de medir.
-- Pode: admin, o personal do aluno, ou o dono da aula onde o aluno está (reposição).
create function public.last_measurement(p_student_id uuid, p_session_id uuid default null)
returns table (
  measured_at timestamptz,
  weight_kg numeric,
  waist_cm numeric,
  abdomen_cm numeric,
  height_cm numeric
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (app.is_admin() or app.owns_student(p_student_id) or app.can_measure_in_session(p_session_id, p_student_id)) then
    raise exception 'Sem permissão para medir este aluno.' using errcode = '42501';
  end if;
  return query
  select
    (select max(m.measured_at) from public.measurements m where m.student_id = p_student_id),
    (select m.weight_kg from public.measurements m where m.student_id = p_student_id and m.weight_kg is not null order by m.measured_at desc limit 1),
    (select m.waist_cm from public.measurements m where m.student_id = p_student_id and m.waist_cm is not null order by m.measured_at desc limit 1),
    (select m.abdomen_cm from public.measurements m where m.student_id = p_student_id and m.abdomen_cm is not null order by m.measured_at desc limit 1),
    (select s.height_cm from public.students s where s.id = p_student_id);
end $$;

revoke all on function public.last_measurement(uuid, uuid) from public, anon;
grant execute on function public.last_measurement(uuid, uuid) to authenticated;
