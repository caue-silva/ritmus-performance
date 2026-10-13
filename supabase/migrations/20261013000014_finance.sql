-- Fase 5: mensalidades sem rotina agendada.

-- Tipo da chave Pix (CPF e celular têm 11 dígitos: sem o tipo, a chave é ambígua).
alter table public.studio_settings
  add column pix_key_type text check (pix_key_type in ('cpf', 'cnpj', 'telefone', 'email', 'aleatoria'));
update public.studio_settings set pix_key_type = 'email' where pix_key like '%@%'; -- bancos já existentes

-- Lembrete antes do vencimento (além de "vence hoje" e "em atraso").
alter table public.studio_settings
  add column msg_reminder text not null default 'Oi, {primeiro_nome}! Só lembrando: sua mensalidade de {valor} vence em {vencimento}. Se quiser adiantar, segue o Pix copia e cola:

{pix}

Obrigado! 🧡';

-- Data da primeira aula do aluno: o primeiro dia (a partir do início de cada
-- horário fixo) que cai no dia da semana do horário.
create function app.first_class_date(p_student_id uuid) returns date
language sql stable security definer set search_path = ''
as $$
  select min(e.starts_on + ((t.weekday - extract(dow from e.starts_on)::int + 7) % 7))
  from public.enrollments e
  join public.time_slots t on t.id = e.time_slot_id
  where e.student_id = p_student_id
$$;

-- Vencimento num mês, respeitando meses curtos (dia 31 → último dia).
create function app.due_date_in(p_competence date, p_due_day smallint) returns date
language sql immutable
as $$
  select make_date(
    extract(year from p_competence)::int,
    extract(month from p_competence)::int,
    least(p_due_day::int, extract(day from (date_trunc('month', p_competence) + interval '1 month - 1 day'))::int)
  )
$$;

-- Garante as cobranças do mês corrente (idempotente: nunca duplica).
-- Regra: a 1ª mensalidade é do mês da primeira aula e vence 7 dias depois dela;
-- as seguintes vencem no dia escolhido pelo aluno. Só alunos ativos com valor.
create function public.ensure_monthly_charges()
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  v_month date := date_trunc('month', app.today_sp())::date;
  v_count integer;
begin
  if not (coalesce(auth.jwt() ->> 'role', '') = 'service_role' or app.is_admin()) then
    raise exception 'Só o administrador gera mensalidades.' using errcode = '42501';
  end if;

  with candidates as (
    select s.id as student_id, b.monthly_fee_cents, b.due_day,
           coalesce(app.first_class_date(s.id), s.activated_at::date, app.today_sp()) as first_class
    from public.students s
    join public.student_billing b on b.student_id = s.id
    where s.status = 'ativo' and b.monthly_fee_cents is not null and s.anonymized_at is null
  ),
  ins as (
    insert into public.charges (student_id, competence, amount_cents, due_date)
    select c.student_id, v_month, c.monthly_fee_cents,
           case
             when date_trunc('month', c.first_class)::date = v_month then c.first_class + 7
             else app.due_date_in(v_month, c.due_day)
           end
    from candidates c
    -- Sem cobrança antes do mês da primeira aula.
    where date_trunc('month', c.first_class)::date <= v_month
      -- Se a 1ª mensalidade já existe (gerada em outro mês), não gera de novo neste.
      and not exists (select 1 from public.charges x where x.student_id = c.student_id and x.competence = v_month)
    on conflict (student_id, competence) do nothing
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end $$;

revoke all on function public.ensure_monthly_charges() from public, anon;
grant execute on function public.ensure_monthly_charges() to authenticated, service_role;

-- Cobranças com o status efetivo ("vencido" é calculado, não gravado).
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
