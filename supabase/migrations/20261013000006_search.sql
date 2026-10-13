-- Busca rápida de aluno (nome sem acento ou telefone). SECURITY INVOKER: o RLS
-- de students vale normalmente — personal só encontra os próprios alunos.

create extension if not exists unaccent with schema extensions;

create function app.normalize(p text) returns text
language sql immutable parallel safe set search_path = ''
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p, ''))) $$;

create index students_name_search_idx on public.students (app.normalize(full_name) text_pattern_ops);

create function public.search_students(q text, max_results integer default 8)
returns table (id uuid, full_name text, whatsapp text, status public.student_status)
language sql stable security invoker set search_path = ''
as $$
  with term as (
    select app.normalize(trim(q)) as name_q, regexp_replace(q, '\D', '', 'g') as digits_q
  )
  select s.id, s.full_name, s.whatsapp, s.status
  from public.students s, term t
  where s.anonymized_at is null
    and length(trim(q)) >= 2
    and (
      app.normalize(s.full_name) like '%' || t.name_q || '%'
      or (length(t.digits_q) >= 4 and s.whatsapp like '%' || t.digits_q || '%')
    )
  order by
    (app.normalize(s.full_name) like t.name_q || '%') desc,
    (s.status = 'ativo') desc,
    s.full_name
  limit least(greatest(max_results, 1), 20)
$$;

revoke all on function public.search_students(text, integer) from public, anon;
grant execute on function public.search_students(text, integer) to authenticated;
grant execute on function app.normalize(text) to authenticated;
