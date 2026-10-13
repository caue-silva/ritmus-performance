-- Foto da equipe (personais e admin). Só fotos de perfil: exames continuam fora do sistema.

alter table public.profiles add column avatar_url text
  check (avatar_url is null or avatar_url ~ '^https?://');

-- Bucket público (foto de perfil não é dado sensível): leitura por URL, escrita controlada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Cada um grava na própria pasta (<id do perfil>/...); o admin grava em qualquer uma.
create policy avatars_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select app.is_admin()))
  );
create policy avatars_update on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select app.is_admin()))
  );
create policy avatars_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select app.is_admin()))
  );
create policy avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
