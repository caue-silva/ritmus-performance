-- Agenda: horários fixos, matrículas, aulas e presenças.
-- Regra do estúdio: um único horário (e um único personal) por vez, com no máximo 4 alunos.

create table public.time_slots (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  personal_id uuid not null references public.profiles (id),
  capacity smallint not null default 4 check (capacity between 1 and 4),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index time_slots_one_per_time on public.time_slots (weekday, start_time) where active;
create index time_slots_personal_idx on public.time_slots (personal_id);
create trigger time_slots_updated_at before update on public.time_slots
  for each row execute function app.set_updated_at();

create function app.owns_slot(p_slot_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.time_slots t
    join public.profiles p on p.id = t.personal_id
    where t.id = p_slot_id and p.id = auth.uid() and p.active
  )
$$;

-- Horários fixos do aluno. Período [starts_on, ends_on) — ends_on exclusivo.
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  time_slot_id uuid not null references public.time_slots (id),
  starts_on date not null default app.today_sp(),
  ends_on date check (ends_on is null or ends_on >= starts_on),
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index enrollments_slot_idx on public.enrollments (time_slot_id);
create index enrollments_student_idx on public.enrollments (student_id);

-- Capacidade das matrículas: trava o horário para evitar corrida entre duas ativações.
create function app.enforce_enrollment_capacity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_capacity smallint;
  v_taken integer;
  v_range daterange := daterange(new.starts_on, new.ends_on, '[)');
begin
  select capacity into v_capacity from public.time_slots where id = new.time_slot_id for update;

  if exists (
    select 1 from public.enrollments e
    where e.time_slot_id = new.time_slot_id and e.student_id = new.student_id and e.id <> new.id
      and daterange(e.starts_on, e.ends_on, '[)') && v_range
  ) then
    raise exception 'O aluno já está neste horário.' using errcode = 'P0001';
  end if;

  select count(*) into v_taken from public.enrollments e
  where e.time_slot_id = new.time_slot_id and e.id <> new.id
    and daterange(e.starts_on, e.ends_on, '[)') && v_range;

  if v_taken >= v_capacity then
    raise exception 'Este horário já está completo (% de % vagas).', v_taken, v_capacity using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger enrollments_capacity before insert or update of time_slot_id, starts_on, ends_on on public.enrollments
  for each row execute function app.enforce_enrollment_capacity();

-- Aula concreta (um horário numa data).
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  time_slot_id uuid not null references public.time_slots (id),
  date date not null,
  start_time time not null,
  personal_id uuid not null references public.profiles (id),
  status public.session_status not null default 'normal',
  status_reason text,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (time_slot_id, date),
  unique (date, start_time)
);
create index class_sessions_personal_date_idx on public.class_sessions (personal_id, date);
create trigger class_sessions_updated_at before update on public.class_sessions
  for each row execute function app.set_updated_at();

create function app.owns_session(p_session_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.class_sessions s
    join public.profiles p on p.id = s.personal_id
    where s.id = p_session_id and p.id = auth.uid() and p.active
  )
$$;

-- Personal pode cancelar/reabrir a própria aula; feriado e troca de personal são do admin.
create function app.guard_session_update() returns trigger
language plpgsql
as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if app.is_privileged() or app.is_admin() then
    return new;
  end if;
  if new.personal_id is distinct from old.personal_id
     or new.time_slot_id is distinct from old.time_slot_id
     or new.date is distinct from old.date
     or new.start_time is distinct from old.start_time
     or new.status = 'feriado' or old.status = 'feriado' then
    raise exception 'Só o administrador pode fazer essa alteração na aula.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger class_sessions_guard before update on public.class_sessions
  for each row execute function app.guard_session_update();

-- Presença de um aluno numa aula (fixo ou reposição).
create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  kind public.attendance_kind not null default 'fixo',
  status public.attendance_status not null default 'previsto',
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles (id),
  status_changed_by uuid references public.profiles (id),
  status_changed_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);
create index attendances_student_idx on public.attendances (student_id);

-- Capacidade por aula: previstos + presentes ≤ capacidade. Falta libera a vaga.
create function app.enforce_attendance_capacity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_capacity smallint;
  v_status public.session_status;
  v_taken integer;
begin
  select t.capacity, s.status into v_capacity, v_status
  from public.class_sessions s
  join public.time_slots t on t.id = s.time_slot_id
  where s.id = new.session_id
  for update of s;

  if tg_op = 'INSERT' and new.kind = 'reposicao' and v_status <> 'normal' then
    raise exception 'Esta aula não vai acontecer, então não dá para marcar reposição nela.' using errcode = 'P0001';
  end if;

  if new.status in ('previsto', 'presente')
     and (tg_op = 'INSERT' or old.status not in ('previsto', 'presente')) then
    select count(*) into v_taken from public.attendances a
    where a.session_id = new.session_id and a.id <> new.id
      and a.status in ('previsto', 'presente');
    if v_taken >= v_capacity then
      raise exception 'Este horário já está completo (% de % vagas).', v_taken, v_capacity using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger attendances_capacity before insert or update of status on public.attendances
  for each row execute function app.enforce_attendance_capacity();

-- Carimba check-in e autoria; impede mudar aluno/aula/tipo depois de criado.
create function app.stamp_attendance() returns trigger
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
    new.checked_in_at := now();
    new.checked_in_by := auth.uid();
  elsif new.status <> 'presente' then
    new.checked_in_at := null;
    new.checked_in_by := null;
  end if;
  return new;
end $$;
create trigger attendances_stamp before insert or update on public.attendances
  for each row execute function app.stamp_attendance();
