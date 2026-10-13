-- Fase 3: geração das aulas sob demanda, feriados, lista da aula e reposição.

-- ---------------------------------------------------------------------------
-- Gera (sem duplicar) as aulas de um período e as presenças "previsto" dos alunos fixos.
-- Chamado pelo servidor quando a agenda/"Agora" abre: não existe rotina agendada.
-- Personal: só os próprios horários. Admin/servidor: todos.
-- ---------------------------------------------------------------------------
create function public.ensure_sessions(p_from date, p_to date)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  -- Dentro de SECURITY DEFINER o current_user é o dono da função, então o "servidor"
  -- é identificado pelo papel do JWT (chave secreta), não por app.is_privileged().
  v_all boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role' or app.is_admin();
  v_uid uuid := auth.uid();
  r record;
begin
  if not v_all and not app.is_staff() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 92 then
    raise exception 'Período inválido.' using errcode = 'P0001';
  end if;

  insert into public.class_sessions (time_slot_id, date, start_time, personal_id, status, status_reason)
  select t.id, d::date, t.start_time, t.personal_id,
         case when c.date is not null then 'feriado'::public.session_status else 'normal' end,
         c.reason
  from generate_series(p_from, p_to, interval '1 day') as d
  join public.time_slots t on t.weekday = extract(dow from d)::int and t.active
  left join public.closures c on c.date = d::date
  where v_all or t.personal_id = v_uid
  on conflict do nothing;

  -- Alunos fixos ativos. Um por vez: se a aula já lotou com reposições, o fixo
  -- fica de fora daquele dia (raro) em vez de derrubar a geração inteira.
  for r in
    select s.id as session_id, e.student_id
    from public.class_sessions s
    join public.enrollments e on e.time_slot_id = s.time_slot_id
      and e.starts_on <= s.date and (e.ends_on is null or e.ends_on > s.date)
    join public.students st on st.id = e.student_id and st.status = 'ativo'
    where s.date between p_from and p_to
      and s.status = 'normal'
      and (v_all or s.personal_id = v_uid)
      and not exists (select 1 from public.attendances a where a.session_id = s.id and a.student_id = e.student_id)
  loop
    begin
      insert into public.attendances (session_id, student_id, kind, status, created_by)
      values (r.session_id, r.student_id, 'fixo', 'previsto', null);
    exception when sqlstate 'P0001' then
      null; -- aula lotada
    end;
  end loop;
end $$;

revoke all on function public.ensure_sessions(date, date) from public, anon;
grant execute on function public.ensure_sessions(date, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Feriado: as aulas do dia viram "feriado" (e voltam ao normal se o feriado sair).
-- ---------------------------------------------------------------------------
create function app.apply_closure() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.class_sessions set status = 'feriado', status_reason = new.reason
    where date = new.date and status = 'normal';
    return new;
  end if;
  update public.class_sessions set status = 'normal', status_reason = null
  where date = old.date and status = 'feriado';
  return old;
end $$;
create trigger closures_apply after insert or delete on public.closures
  for each row execute function app.apply_closure();

-- Trocar o personal de um horário fixo passa as próximas aulas para o novo personal.
create function app.propagate_slot_personal() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.class_sessions set personal_id = new.personal_id
  where time_slot_id = new.id and date >= app.today_sp();
  return new;
end $$;
create trigger time_slots_propagate_personal after update of personal_id on public.time_slots
  for each row when (old.personal_id is distinct from new.personal_id)
  execute function app.propagate_slot_personal();

-- Carga de dados antigos (seed/importação): o servidor pode informar o horário do check-in.
create or replace function app.stamp_attendance() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if not app.is_privileged() and (
         new.session_id is distinct from old.session_id
         or new.student_id is distinct from old.student_id
         or new.kind is distinct from old.kind
         or new.created_by is distinct from old.created_by) then
      raise exception 'Não é possível mover a presença para outro aluno ou aula.' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      new.status_changed_by := auth.uid();
      new.status_changed_at := now();
    end if;
  end if;
  if new.status = 'presente' and (tg_op = 'INSERT' or old.status <> 'presente') then
    if not (app.is_privileged() and new.checked_in_at is not null) then
      new.checked_in_at := now();
      new.checked_in_by := auth.uid();
    end if;
  elsif new.status <> 'presente' then
    new.checked_in_at := null;
    new.checked_in_by := null;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Lista da aula. SECURITY DEFINER para mostrar o NOME do aluno de reposição
-- que é de outro personal — sem abrir a ficha nem a saúde dele.
-- Aviso de saúde só para alunos do próprio personal (ou admin).
-- ---------------------------------------------------------------------------
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
  created_at timestamptz
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
         a.created_at
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

-- ---------------------------------------------------------------------------
-- Busca de aluno para reposição: só nome e o personal dele, de alunos ativos
-- que ainda não estão nesta aula. Só o dono da aula (ou admin) usa.
-- ---------------------------------------------------------------------------
create function public.search_students_for_makeup(p_session_id uuid, q text)
returns table (id uuid, full_name text, owner_name text, is_mine boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (app.is_admin() or app.owns_session(p_session_id)) then
    raise exception 'Só o dono do horário registra reposição.' using errcode = '42501';
  end if;
  return query
  select st.id, st.full_name, p.full_name, st.personal_id = auth.uid()
  from public.students st
  left join public.profiles p on p.id = st.personal_id
  where st.status = 'ativo' and st.anonymized_at is null
    and (length(trim(coalesce(q, ''))) = 0 or app.normalize(st.full_name) like '%' || app.normalize(trim(q)) || '%')
    and not exists (select 1 from public.attendances a where a.session_id = p_session_id and a.student_id = st.id)
  order by (st.personal_id = auth.uid()) desc, st.full_name
  limit 12;
end $$;

revoke all on function public.search_students_for_makeup(uuid, text) from public, anon;
grant execute on function public.search_students_for_makeup(uuid, text) to authenticated;

-- Vagas por aula (previstos + presentes), para a agenda.
create view public.session_occupancy
with (security_invoker = true) as
select s.id as session_id, s.date, s.start_time, s.personal_id, s.status, s.status_reason, s.time_slot_id,
       t.capacity,
       count(a.id) filter (where a.status in ('previsto', 'presente'))::int as taken,
       count(a.id) filter (where a.status = 'presente')::int as present,
       count(a.id) filter (where a.kind = 'reposicao')::int as makeups
from public.class_sessions s
join public.time_slots t on t.id = s.time_slot_id
left join public.attendances a on a.session_id = s.id
group by s.id, t.capacity;

revoke all on public.session_occupancy from anon;
grant select on public.session_occupancy to authenticated;
