-- Alunos, saúde (PAR-Q), dados financeiros do aluno, convites e consentimentos.

create table public.students (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid references public.profiles (id),
  status public.student_status not null default 'convidado',
  full_name text not null check (length(trim(full_name)) > 0),
  whatsapp text not null check (whatsapp ~ '^\d{10,11}$'),
  cpf text check (cpf ~ '^\d{11}$'),
  birth_date date,
  email text,
  cep text check (cep ~ '^\d{8}$'),
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text check (state ~ '^[A-Z]{2}$'),
  emergency_name text,
  emergency_phone text check (emergency_phone ~ '^\d{10,11}$'),
  emergency_relation text,
  goals text[] not null default '{}',
  goals_notes text,
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  weekly_frequency smallint check (weekly_frequency between 1 and 6),
  submitted_at timestamptz,
  activated_at timestamptz,
  activated_by uuid references public.profiles (id),
  status_changed_at timestamptz not null default now(),
  anonymized_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index students_cpf_key on public.students (cpf) where cpf is not null;
create index students_personal_idx on public.students (personal_id);
create index students_status_idx on public.students (status);
create trigger students_updated_at before update on public.students
  for each row execute function app.set_updated_at();

-- "Meu aluno": o aluno está vinculado a quem executa e esse personal está ativo.
create function app.owns_student(p_student_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.students s
    join public.profiles p on p.id = s.personal_id
    where s.id = p_student_id and p.id = auth.uid() and p.active
  )
$$;

-- Saúde: separada da ficha para isolar dados sensíveis.
create table public.student_health (
  student_id uuid primary key references public.students (id) on delete cascade,
  parq_answers boolean[] not null check (cardinality(parq_answers) = 7 and array_position(parq_answers, null) is null),
  health_notes text,
  requires_clearance boolean generated always as (true = any (parq_answers)) stored,
  clearance_received_on date,
  clearance_registered_by uuid references public.profiles (id),
  clearance_registered_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger student_health_updated_at before update on public.student_health
  for each row execute function app.set_updated_at();

-- Financeiro do aluno: somente admin.
create table public.student_billing (
  student_id uuid primary key references public.students (id) on delete cascade,
  monthly_fee_cents integer check (monthly_fee_cents > 0),
  due_day smallint not null default 10 check (due_day between 1 and 31),
  updated_by uuid default auth.uid() references public.profiles (id),
  updated_at timestamptz not null default now()
);
create trigger student_billing_updated_at before update on public.student_billing
  for each row execute function app.set_updated_at();

-- Link de cadastro. Só o hash do token é guardado.
create table public.student_invites (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  draft jsonb not null default '{}'::jsonb,
  draft_step smallint not null default 0,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index student_invites_student_idx on public.student_invites (student_id);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  legal_document_id uuid not null references public.legal_documents (id),
  accepted_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  unique (student_id, legal_document_id)
);

-- Personal edita dados cadastrais dos próprios alunos, mas não status,
-- vínculo, ativação ou anonimização.
create function app.guard_student_update() returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  if app.is_privileged() or app.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.personal_id is distinct from old.personal_id
     or new.activated_at is distinct from old.activated_at
     or new.activated_by is distinct from old.activated_by
     or new.submitted_at is distinct from old.submitted_at
     or new.anonymized_at is distinct from old.anonymized_at
     or new.created_by is distinct from old.created_by then
    raise exception 'Só o administrador pode alterar o status ou o personal do aluno.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger students_guard before update on public.students
  for each row execute function app.guard_student_update();

-- Ativação exige personal e, se o PAR-Q tiver "sim", liberação médica registrada.
create function app.check_student_activation() returns trigger
language plpgsql
as $$
declare
  v_needs boolean;
  v_cleared date;
begin
  if new.status = 'ativo' and (tg_op = 'INSERT' or old.status is distinct from 'ativo') then
    if new.personal_id is null then
      raise exception 'Escolha o personal responsável antes de ativar o aluno.' using errcode = 'P0001';
    end if;
    select h.requires_clearance, h.clearance_received_on
      into v_needs, v_cleared
      from public.student_health h where h.student_id = new.id;
    if coalesce(v_needs, false) and v_cleared is null then
      raise exception 'Este aluno precisa de liberação médica antes de ser ativado.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger students_check_activation before insert or update of status on public.students
  for each row execute function app.check_student_activation();
