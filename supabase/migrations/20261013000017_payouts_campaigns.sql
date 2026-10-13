-- Fase 7: repasses dos professores, campanhas, ranking e selos.

-- ---------------------------------------------------------------------------
-- Comissão por professor (com histórico: vale a partir de uma data)
-- ---------------------------------------------------------------------------
create table public.staff_commission_rates (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.profiles (id) on delete cascade,
  rate_bp integer not null check (rate_bp between 0 and 10000), -- 6500 = 65%
  valid_from date not null,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (personal_id, valid_from)
);

-- % (em pontos-base) que vale para o professor numa data. Sem cadastro = 0.
create function app.commission_rate(p_personal_id uuid, p_on date) returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select r.rate_bp from public.staff_commission_rates r
     where r.personal_id = p_personal_id and r.valid_from <= p_on
     order by r.valid_from desc limit 1),
    0)
$$;

-- ---------------------------------------------------------------------------
-- Mensalidade guarda o professor do aluno quando foi gerada
-- ---------------------------------------------------------------------------
alter table public.charges add column personal_id uuid references public.profiles (id);
update public.charges c set personal_id = s.personal_id from public.students s where s.id = c.student_id;

create function app.charge_set_personal() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.personal_id is null then
    select s.personal_id into new.personal_id from public.students s where s.id = new.student_id;
  end if;
  return new;
end $$;
create trigger charges_set_personal before insert on public.charges
  for each row execute function app.charge_set_personal();

-- A view de cobranças foi criada antes da coluna nova: recria para incluir personal_id.
drop view public.charges_view;
create view public.charges_view
with (security_invoker = true) as
select c.*,
       case
         when c.status = 'pendente' and c.due_date < app.today_sp() then 'vencido'
         else c.status::text
       end as effective_status,
       greatest(0, app.today_sp() - c.due_date) as days_overdue,
       s.full_name, s.whatsapp
from public.charges c
join public.students s on s.id = c.student_id;
revoke all on public.charges_view from anon;
grant select on public.charges_view to authenticated;

-- ---------------------------------------------------------------------------
-- Quem trouxe o aluno (para o bônus de indicação)
-- ---------------------------------------------------------------------------
alter table public.students add column referred_by uuid references public.profiles (id);

create or replace function app.guard_student_update() returns trigger
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
     or new.referred_by is distinct from old.referred_by
     or new.activated_at is distinct from old.activated_at
     or new.activated_by is distinct from old.activated_by
     or new.submitted_at is distinct from old.submitted_at
     or new.anonymized_at is distinct from old.anonymized_at
     or new.created_by is distinct from old.created_by then
    raise exception 'Só o administrador pode alterar o status, o personal ou quem trouxe o aluno.' using errcode = '42501';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Participação no ranking (null = padrão: personal participa, admin não)
-- ---------------------------------------------------------------------------
alter table public.profiles add column joins_ranking boolean;

create or replace function app.guard_profile_update() returns trigger
language plpgsql
as $$
begin
  if app.is_privileged() or app.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.active is distinct from old.active
     or new.email is distinct from old.email
     or new.must_change_password is distinct from old.must_change_password
     or new.joins_ranking is distinct from old.joins_ranking then
    raise exception 'Só o administrador pode alterar esses dados.' using errcode = '42501';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Campanhas (mural + bônus de indicação opcional)
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  body text,
  image_url text check (image_url is null or image_url ~ '^https?://'),
  link_url text check (link_url is null or link_url ~ '^https?://'),
  starts_on date not null,
  ends_on date not null,
  referral_bonus boolean not null default false, -- 1ª mensalidade 100% para quem trouxe o aluno
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function app.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaigns', 'campaigns', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy campaigns_art_write on storage.objects for insert to authenticated
  with check (bucket_id = 'campaigns' and (select app.is_admin()));
create policy campaigns_art_update on storage.objects for update to authenticated
  using (bucket_id = 'campaigns' and (select app.is_admin()));
create policy campaigns_art_delete on storage.objects for delete to authenticated
  using (bucket_id = 'campaigns' and (select app.is_admin()));
create policy campaigns_art_read on storage.objects for select to authenticated
  using (bucket_id = 'campaigns');

-- ---------------------------------------------------------------------------
-- Repasses pagos e selos
-- ---------------------------------------------------------------------------
create table public.staff_payouts (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.profiles (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  amount_cents integer not null check (amount_cents >= 0),
  paid_on date not null,
  payment_method public.payment_method not null,
  note text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (personal_id, month)
);

create table public.staff_awards (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.profiles (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  kind text not null default 'professor_do_mes' check (kind in ('professor_do_mes')),
  classes integer not null,
  checkins integer not null,
  created_at timestamptz not null default now(),
  unique (personal_id, month, kind)
);

-- ---------------------------------------------------------------------------
-- Cálculo do repasse: uma linha por mensalidade paga no mês
-- ---------------------------------------------------------------------------
-- Regras: base = mensalidades PAGAS no mês (data do pagamento), do professor do aluno;
-- % que valia na data do pagamento; 1ª mensalidade de aluno indicado e ativado durante
-- uma campanha de indicação vai 100% para quem trouxe (sem comissão normal).
create function app.payout_lines(p_month date)
returns table (
  personal_id uuid,
  charge_id uuid,
  student_id uuid,
  student_name text,
  paid_on date,
  amount_cents integer,
  rate_bp integer,
  commission_cents integer,
  bonus_cents integer
)
language sql stable security definer set search_path = ''
as $$
  with paid as (
    select c.*, s.full_name, s.referred_by, s.activated_at,
           -- 1ª mensalidade do aluno (menor competência não cancelada)
           c.competence = (select min(x.competence) from public.charges x
                           where x.student_id = c.student_id and x.status <> 'cancelado') as is_first
    from public.charges c
    join public.students s on s.id = c.student_id
    where c.status = 'pago'
      and c.paid_on >= p_month and c.paid_on < (p_month + interval '1 month')::date
  ),
  classified as (
    select p.*,
           (p.is_first and p.referred_by is not null and exists (
              select 1 from public.campaigns k
              where k.referral_bonus
                and p.activated_at::date between k.starts_on and k.ends_on
           )) as bonus
    from paid p
  )
  select
    case when c.bonus then c.referred_by else c.personal_id end,
    c.id, c.student_id, c.full_name, c.paid_on, c.amount_cents,
    case when c.bonus then 10000 else app.commission_rate(c.personal_id, c.paid_on) end,
    case when c.bonus then 0 else round(c.amount_cents * app.commission_rate(c.personal_id, c.paid_on) / 10000.0)::int end,
    case when c.bonus then c.amount_cents else 0 end
  from classified c
  where (case when c.bonus then c.referred_by else c.personal_id end) is not null
$$;

-- Admin: repasse de cada professor no mês.
create function public.payout_report(p_month date)
returns table (
  personal_id uuid,
  full_name text,
  avatar_url text,
  current_rate_bp integer,
  base_cents integer,
  commission_cents integer,
  bonus_cents integer,
  total_cents integer,
  charges_count integer,
  paid_amount_cents integer,
  paid_on date,
  payment_method public.payment_method,
  payout_note text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (coalesce(auth.jwt() ->> 'role', '') = 'service_role' or app.is_admin()) then
    raise exception 'Só o administrador vê os repasses.' using errcode = '42501';
  end if;
  return query
  with lines as (select * from app.payout_lines(p_month))
  select p.id, p.full_name, p.avatar_url,
         app.commission_rate(p.id, least(app.today_sp(), ((p_month + interval '1 month')::date - 1))),
         coalesce(sum(l.amount_cents) filter (where l.bonus_cents = 0), 0)::int,
         coalesce(sum(l.commission_cents), 0)::int,
         coalesce(sum(l.bonus_cents), 0)::int,
         coalesce(sum(l.commission_cents + l.bonus_cents), 0)::int,
         count(l.charge_id)::int,
         sp.amount_cents, sp.paid_on, sp.payment_method, sp.note
  from public.profiles p
  left join lines l on l.personal_id = p.id
  left join public.staff_payouts sp on sp.personal_id = p.id and sp.month = p_month
  where p.active
  group by p.id, sp.id
  -- Só quem tem comissão, algo a receber no mês ou repasse registrado (o Gabriel, com 0%, não aparece).
  having app.commission_rate(p.id, least(app.today_sp(), ((p_month + interval '1 month')::date - 1))) > 0
      or coalesce(sum(l.commission_cents + l.bonus_cents), 0) > 0 or sp.id is not null
  order by p.full_name;
end $$;

-- Admin: detalhe por aluno, para conferir.
create function public.payout_details(p_month date, p_personal_id uuid)
returns table (charge_id uuid, student_id uuid, student_name text, paid_on date, amount_cents integer, rate_bp integer, commission_cents integer, bonus_cents integer)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Só o administrador vê o detalhe dos repasses.' using errcode = '42501';
  end if;
  return query
  select l.charge_id, l.student_id, l.student_name, l.paid_on, l.amount_cents, l.rate_bp, l.commission_cents, l.bonus_cents
  from app.payout_lines(p_month) l
  where l.personal_id = p_personal_id
  order by l.paid_on, l.student_name;
end $$;

-- Personal: SÓ o próprio total (nunca por aluno).
create function public.my_payout(p_month date)
returns table (total_cents integer, bonus_cents integer, paid_amount_cents integer, paid_on date)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not app.is_staff() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
  select coalesce(sum(l.commission_cents + l.bonus_cents), 0)::int,
         coalesce(sum(l.bonus_cents), 0)::int,
         (select sp.amount_cents from public.staff_payouts sp where sp.personal_id = auth.uid() and sp.month = p_month),
         (select sp.paid_on from public.staff_payouts sp where sp.personal_id = auth.uid() and sp.month = p_month)
  from app.payout_lines(p_month) l
  where l.personal_id = auth.uid();
end $$;

-- ---------------------------------------------------------------------------
-- Ranking de aulas dadas e selo "Professor do mês"
-- ---------------------------------------------------------------------------
create function app.ranking(p_month date)
returns table (personal_id uuid, full_name text, avatar_url text, classes integer, checkins integer, rank_position integer)
language sql stable security definer set search_path = ''
as $$
  with counts as (
    select p.id, p.full_name, p.avatar_url,
           count(distinct s.id) filter (where exists (
             select 1 from public.attendances a where a.session_id = s.id and a.status = 'presente'))::int as classes,
           count(a.id) filter (where a.status = 'presente')::int as checkins
    from public.profiles p
    left join public.class_sessions s on s.personal_id = p.id and s.status = 'normal'
      and s.date >= p_month and s.date < (p_month + interval '1 month')::date and s.date <= app.today_sp()
    left join public.attendances a on a.session_id = s.id
    where p.active and coalesce(p.joins_ranking, p.role = 'personal')
    group by p.id
  )
  select c.id, c.full_name, c.avatar_url, c.classes, c.checkins,
         (dense_rank() over (order by c.classes desc, c.checkins desc))::int
  from counts c
  order by 6, c.full_name
$$;

create function public.teaching_ranking(p_month date)
returns table (personal_id uuid, full_name text, avatar_url text, classes integer, checkins integer, rank_position integer)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (coalesce(auth.jwt() ->> 'role', '') = 'service_role' or app.is_staff()) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query select * from app.ranking(p_month);
end $$;

-- Sem rotina agendada: fixa o selo do mês anterior na primeira abertura do app.
create function public.ensure_monthly_awards()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_prev date := (date_trunc('month', app.today_sp()) - interval '1 month')::date;
begin
  if not (coalesce(auth.jwt() ->> 'role', '') = 'service_role' or app.is_staff()) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if exists (select 1 from public.staff_awards where month = v_prev and kind = 'professor_do_mes') then
    return;
  end if;
  insert into public.staff_awards (personal_id, month, kind, classes, checkins)
  select r.personal_id, v_prev, 'professor_do_mes', r.classes, r.checkins
  from app.ranking(v_prev) r
  where r.rank_position = 1 and r.classes > 0
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.staff_commission_rates enable row level security;
alter table public.campaigns enable row level security;
alter table public.staff_payouts enable row level security;
alter table public.staff_awards enable row level security;

create policy commission_rates_admin on public.staff_commission_rates for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));
create policy payouts_admin on public.staff_payouts for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));
create policy campaigns_select on public.campaigns for select to authenticated
  using ((select app.is_staff()));
create policy campaigns_admin on public.campaigns for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));
create policy awards_select on public.staff_awards for select to authenticated
  using ((select app.is_staff()));
create policy awards_admin on public.staff_awards for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

revoke all on public.staff_commission_rates, public.campaigns, public.staff_payouts, public.staff_awards from anon;
revoke all on function public.payout_report(date), public.payout_details(date, uuid), public.my_payout(date),
  public.teaching_ranking(date), public.ensure_monthly_awards() from public, anon;
grant execute on function public.payout_report(date), public.payout_details(date, uuid), public.my_payout(date),
  public.teaching_ranking(date), public.ensure_monthly_awards() to authenticated, service_role;
revoke all on function app.commission_rate(uuid, date), app.payout_lines(date), app.ranking(date) from public, anon, authenticated;
