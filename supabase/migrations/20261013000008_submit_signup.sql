-- Envio do formulário público de cadastro, numa única transação.
-- Chamado só pelo servidor (service role) depois de validar os campos.
-- p_data já vem normalizado: datas ISO, telefones/CPF/CEP só com dígitos, números como número.

create function public.submit_signup(
  p_token_hash text,
  p_data jsonb,
  p_doc_ids uuid[],
  p_ip inet,
  p_user_agent text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.student_invites;
  v_student uuid;
begin
  select * into v_invite from public.student_invites where token_hash = p_token_hash for update;
  if not found then
    raise exception 'convite_invalido' using errcode = 'P0001';
  end if;
  if v_invite.used_at is not null then
    raise exception 'convite_usado' using errcode = 'P0001';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'convite_expirado' using errcode = 'P0001';
  end if;

  -- Os três textos aceitos (termos, LGPD, declaração de saúde), na versão que a pessoa viu.
  if (select count(distinct kind) from public.legal_documents where id = any (p_doc_ids)) <> 3 then
    raise exception 'documentos_invalidos' using errcode = 'P0001';
  end if;

  v_student := v_invite.student_id;

  update public.students set
    full_name = p_data ->> 'full_name',
    cpf = p_data ->> 'cpf',
    birth_date = (p_data ->> 'birth_date')::date,
    whatsapp = p_data ->> 'whatsapp',
    email = nullif(p_data ->> 'email', ''),
    cep = p_data ->> 'cep',
    street = p_data ->> 'street',
    number = p_data ->> 'number',
    complement = nullif(p_data ->> 'complement', ''),
    neighborhood = p_data ->> 'neighborhood',
    city = p_data ->> 'city',
    state = p_data ->> 'state',
    emergency_name = p_data ->> 'emergency_name',
    emergency_phone = p_data ->> 'emergency_phone',
    emergency_relation = p_data ->> 'emergency_relation',
    goals = array(select jsonb_array_elements_text(coalesce(p_data -> 'goals', '[]'::jsonb))),
    goals_notes = nullif(p_data ->> 'goals_notes', ''),
    height_cm = (p_data ->> 'height_cm')::numeric,
    status = case when status = 'convidado' then 'aguardando'::public.student_status else status end,
    submitted_at = now()
  where id = v_student;

  insert into public.student_health (student_id, parq_answers, health_notes)
  values (
    v_student,
    array(select x::boolean from jsonb_array_elements_text(p_data -> 'parq') as x),
    nullif(p_data ->> 'health_notes', '')
  )
  on conflict (student_id) do update
    set parq_answers = excluded.parq_answers, health_notes = excluded.health_notes;

  insert into public.student_billing (student_id, due_day, updated_by)
  values (v_student, (p_data ->> 'due_day')::smallint, null)
  on conflict (student_id) do update set due_day = excluded.due_day;

  if p_data ->> 'weight_kg' is not null then
    insert into public.measurements (client_id, student_id, weight_kg, height_cm, source, created_by)
    values (gen_random_uuid(), v_student, (p_data ->> 'weight_kg')::numeric, (p_data ->> 'height_cm')::numeric, 'cadastro', null);
  end if;

  insert into public.consents (student_id, legal_document_id, ip, user_agent)
  select v_student, d, p_ip, left(p_user_agent, 400) from unnest(p_doc_ids) as d
  on conflict (student_id, legal_document_id) do nothing;

  update public.student_invites set used_at = now(), draft = '{}'::jsonb where id = v_invite.id;
  -- Outros links do mesmo aluno deixam de valer.
  update public.student_invites set expires_at = least(expires_at, now())
  where student_id = v_student and id <> v_invite.id and used_at is null;

  return v_student;
end $$;

revoke all on function public.submit_signup(text, jsonb, uuid[], inet, text) from public, anon, authenticated;
grant execute on function public.submit_signup(text, jsonb, uuid[], inet, text) to service_role;
