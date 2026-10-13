-- Evolução (medições) e financeiro (cobranças + histórico).

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique, -- gerado no aparelho: reenvio offline não duplica
  student_id uuid not null references public.students (id) on delete cascade,
  session_id uuid references public.class_sessions (id) on delete set null,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5, 2) check (weight_kg between 20 and 300),
  waist_cm numeric(5, 1) check (waist_cm between 30 and 250),
  abdomen_cm numeric(5, 1) check (abdomen_cm between 30 and 250),
  notes text,
  height_cm numeric(5, 1) check (height_cm between 100 and 250), -- altura no momento da medição
  bmi numeric(4, 1) generated always as (
    case when weight_kg is not null and height_cm is not null
      then round(weight_kg / ((height_cm / 100) * (height_cm / 100)), 1)
    end
  ) stored,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  check (weight_kg is not null or waist_cm is not null or abdomen_cm is not null or notes is not null)
);
create index measurements_student_idx on public.measurements (student_id, measured_at desc);

-- Altura: se não vier, usa a do cadastro.
create function app.fill_measurement_height() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.height_cm is null then
    select s.height_cm into new.height_cm from public.students s where s.id = new.student_id;
  end if;
  return new;
end $$;
create trigger measurements_fill_height before insert on public.measurements
  for each row execute function app.fill_measurement_height();

-- O dono da aula pode medir um aluno de reposição (de outro personal) naquela aula.
create function app.can_measure_in_session(p_session_id uuid, p_student_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_session_id is not null and exists (
    select 1
    from public.attendances a
    join public.class_sessions s on s.id = a.session_id
    join public.profiles p on p.id = s.personal_id
    where a.session_id = p_session_id and a.student_id = p_student_id
      and p.id = auth.uid() and p.active
  )
$$;

-- ---------------------------------------------------------------------------
-- Financeiro (somente admin)
-- ---------------------------------------------------------------------------
create table public.charges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  competence date not null check (extract(day from competence) = 1), -- 1º dia do mês de referência
  amount_cents integer not null check (amount_cents > 0),
  due_date date not null,
  status public.charge_status not null default 'pendente',
  paid_on date,
  payment_method public.payment_method,
  payment_note text,
  confirmed_by uuid references public.profiles (id),
  confirmed_at timestamptz,
  canceled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, competence),
  check (status <> 'pago' or (paid_on is not null and payment_method is not null))
);
create index charges_status_due_idx on public.charges (status, due_date);
create trigger charges_updated_at before update on public.charges
  for each row execute function app.set_updated_at();

create table public.charge_events (
  id bigint generated always as identity primary key,
  charge_id uuid not null references public.charges (id) on delete cascade,
  action text not null check (action in ('criada', 'valor_ajustado', 'vencimento_ajustado', 'paga', 'pagamento_desfeito', 'cancelada', 'reaberta')),
  old_value jsonb,
  new_value jsonb,
  actor_id uuid references public.profiles (id),
  at timestamptz not null default now()
);
create index charge_events_charge_idx on public.charge_events (charge_id, at);

-- Histórico automático de toda alteração relevante numa cobrança.
create function app.log_charge_event() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.charge_events (charge_id, action, new_value, actor_id)
    values (new.id, 'criada', jsonb_build_object('amount_cents', new.amount_cents, 'due_date', new.due_date), v_actor);
    return new;
  end if;

  if new.amount_cents is distinct from old.amount_cents then
    insert into public.charge_events (charge_id, action, old_value, new_value, actor_id)
    values (new.id, 'valor_ajustado', to_jsonb(old.amount_cents), to_jsonb(new.amount_cents), v_actor);
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.charge_events (charge_id, action, old_value, new_value, actor_id)
    values (new.id, 'vencimento_ajustado', to_jsonb(old.due_date), to_jsonb(new.due_date), v_actor);
  end if;
  if new.status is distinct from old.status then
    insert into public.charge_events (charge_id, action, old_value, new_value, actor_id)
    values (
      new.id,
      case
        when new.status = 'pago' then 'paga'
        when new.status = 'cancelado' then 'cancelada'
        when old.status = 'pago' then 'pagamento_desfeito'
        else 'reaberta'
      end,
      jsonb_build_object('status', old.status, 'paid_on', old.paid_on, 'payment_method', old.payment_method),
      jsonb_build_object('status', new.status, 'paid_on', new.paid_on, 'payment_method', new.payment_method, 'note', coalesce(new.payment_note, new.canceled_reason)),
      v_actor
    );
  end if;
  return new;
end $$;
create trigger charges_log after insert or update on public.charges
  for each row execute function app.log_charge_event();

-- Carimba quem confirmou; limpa dados de pagamento ao desfazer.
create function app.stamp_charge() returns trigger
language plpgsql
as $$
begin
  if new.status = 'pago' and old.status is distinct from 'pago' then
    new.confirmed_by := auth.uid();
    new.confirmed_at := now();
  elsif new.status <> 'pago' then
    new.paid_on := null;
    new.payment_method := null;
    new.confirmed_by := null;
    new.confirmed_at := null;
  end if;
  return new;
end $$;
create trigger charges_stamp before update on public.charges
  for each row execute function app.stamp_charge();
