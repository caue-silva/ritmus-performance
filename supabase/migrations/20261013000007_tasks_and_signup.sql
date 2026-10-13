-- Fase 2: medição inicial vinda do formulário, Central de tarefas e helpers de cadastro.

-- Medição inicial (altura/peso do formulário público) não tem um membro da equipe como autor.
alter table public.measurements add column source text not null default 'aula' check (source in ('aula', 'cadastro'));
alter table public.measurements alter column created_by drop not null;
alter table public.measurements add constraint measurements_author_check
  check (created_by is not null or source = 'cadastro');

-- ---------------------------------------------------------------------------
-- Central de tarefas do admin. Derivada do estado: resolver a causa faz a tarefa sumir.
-- security_invoker + filtro explícito por is_admin(): personal nunca recebe linhas
-- (a tarefa "sem valor" revelaria informação financeira).
-- ---------------------------------------------------------------------------
create view public.admin_tasks
with (security_invoker = true) as
with base as (
  -- Cobranças em atraso
  select 'atrasado'::text as kind, 1 as priority, c.student_id, c.id as charge_id,
         c.amount_cents, c.due_date as ref_date
  from public.charges c
  where c.status = 'pendente' and c.due_date < app.today_sp()
  union all
  -- Cobranças que vencem hoje
  select 'vence_hoje', 2, c.student_id, c.id, c.amount_cents, c.due_date
  from public.charges c
  where c.status = 'pendente' and c.due_date = app.today_sp()
  union all
  -- Liberação médica pendente (PAR-Q com "sim")
  select 'liberacao', 3, s.id, null, null, s.submitted_at::date
  from public.students s
  join public.student_health h on h.student_id = s.id
  where h.requires_clearance and h.clearance_received_on is null
    and s.status in ('aguardando', 'ativo', 'pausado')
  union all
  -- Cadastro recebido aguardando ativação (só depois da liberação, quando houver)
  select 'cadastro', 3, s.id, null, null, s.submitted_at::date
  from public.students s
  left join public.student_health h on h.student_id = s.id
  where s.status = 'aguardando'
    and not (coalesce(h.requires_clearance, false) and h.clearance_received_on is null)
  union all
  -- Aluno ativo sem valor de mensalidade definido
  select 'valor', 4, s.id, null, null, s.activated_at::date
  from public.students s
  left join public.student_billing b on b.student_id = s.id
  where s.status = 'ativo' and b.monthly_fee_cents is null
)
select b.kind, b.priority, b.student_id, s.full_name, s.whatsapp, b.charge_id, b.amount_cents, b.ref_date
from base b
join public.students s on s.id = b.student_id
where app.is_admin() and s.anonymized_at is null
order by b.priority, b.ref_date nulls last, s.full_name;

revoke all on public.admin_tasks from anon;
grant select on public.admin_tasks to authenticated;

-- Vagas ocupadas por horário fixo (para escolher horários na ativação).
-- Conta matrículas vigentes ou futuras: é o mesmo critério do trigger de capacidade
-- para uma matrícula nova sem data de fim.
create view public.time_slot_occupancy
with (security_invoker = true) as
select t.id as time_slot_id, t.weekday, t.start_time, t.personal_id, t.capacity, t.active,
       count(e.id) filter (where e.ends_on is null or e.ends_on > app.today_sp())::int as taken
from public.time_slots t
left join public.enrollments e on e.time_slot_id = t.id
group by t.id;

revoke all on public.time_slot_occupancy from anon;
grant select on public.time_slot_occupancy to authenticated;
