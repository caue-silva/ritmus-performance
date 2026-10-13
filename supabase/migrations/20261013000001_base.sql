-- Ritmus Performance — base: schema auxiliar, enums, equipe e configurações.
-- Convenção: helpers e triggers ficam no schema `app` (não exposto pela API).

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.staff_role as enum ('admin', 'personal');
create type public.student_status as enum ('convidado', 'aguardando', 'ativo', 'pausado', 'inativo');
create type public.session_status as enum ('normal', 'cancelada', 'feriado');
create type public.attendance_kind as enum ('fixo', 'reposicao');
create type public.attendance_status as enum ('previsto', 'presente', 'falta', 'falta_justificada');
create type public.charge_status as enum ('pendente', 'pago', 'cancelado');
create type public.payment_method as enum ('pix', 'dinheiro', 'cartao', 'outro');
create type public.legal_doc_kind as enum ('termos', 'lgpd', 'declaracao_saude');

-- ---------------------------------------------------------------------------
-- Helpers genéricos
-- ---------------------------------------------------------------------------

-- Data de hoje no fuso do estúdio.
create function app.today_sp() returns date
language sql stable
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- Verdadeiro quando quem executa é o servidor (service role) ou uma migration/seed.
-- SECURITY INVOKER de propósito: precisa enxergar o current_user real.
create function app.is_privileged() returns boolean
language sql stable
as $$ select current_user in ('postgres', 'service_role', 'supabase_admin') $$;

create function app.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Equipe
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null,
  whatsapp text check (whatsapp ~ '^\d{10,11}$'),
  role public.staff_role not null default 'personal',
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function app.set_updated_at();

-- Helpers de perfil. SECURITY DEFINER para não depender do RLS de profiles
-- (evita recursão) e ficam estáveis dentro de uma query.
create function app.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
  )
$$;

create function app.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role = 'admin'
  )
$$;

-- Personal só altera o próprio nome e WhatsApp; o resto é do admin ou do servidor.
create function app.guard_profile_update() returns trigger
language plpgsql
as $$
begin
  if app.is_privileged() or app.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.active is distinct from old.active
     or new.email is distinct from old.email
     or new.must_change_password is distinct from old.must_change_password then
    raise exception 'Só o administrador pode alterar esses dados.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function app.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Configurações
-- ---------------------------------------------------------------------------

-- Financeiro e mensagens: somente admin.
create table public.studio_settings (
  id boolean primary key default true check (id),
  studio_name text not null default 'Ritmus Performance',
  pix_key text,
  pix_receiver_name text,
  pix_city text,
  msg_invite text not null,
  msg_due_today text not null,
  msg_overdue text not null,
  reference_fees jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
create trigger studio_settings_updated_at before update on public.studio_settings
  for each row execute function app.set_updated_at();

-- Agenda: leitura para toda a equipe.
create table public.agenda_settings (
  id boolean primary key default true check (id),
  class_duration_min smallint not null default 60 check (class_duration_min between 15 and 180),
  updated_at timestamptz not null default now()
);
create trigger agenda_settings_updated_at before update on public.agenda_settings
  for each row execute function app.set_updated_at();

create table public.business_hours (
  weekday smallint primary key check (weekday between 0 and 6), -- 0 = domingo
  opens_at time not null,
  closes_at time not null,
  check (closes_at > opens_at)
);

create table public.closures (
  date date primary key,
  reason text not null default 'Feriado',
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Textos legais versionados: editar = inserir nova versão.
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  kind public.legal_doc_kind not null,
  version integer not null check (version > 0),
  body text not null check (length(trim(body)) > 0),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (kind, version)
);

create view public.current_legal_documents
with (security_invoker = true) as
  select distinct on (kind) id, kind, version, body, created_at
  from public.legal_documents
  order by kind, version desc;
