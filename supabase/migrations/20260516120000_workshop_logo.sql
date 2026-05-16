-- ============================================================
-- Workshop logo: campo profiles.logo_url + bucket pubblico
-- ============================================================

alter table public.profiles
  add column if not exists logo_url text;

-- Bucket pubblico (i loghi non sono sensibili)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2 * 1024 * 1024, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Owner del file (primo segmento path = user_id) può leggere/scrivere
create policy "branding_select_own"
  on storage.objects for select
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "branding_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "branding_update_own"
  on storage.objects for update
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "branding_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lettura pubblica (gli URL pubblici devono funzionare per il PDF & sidebar)
create policy "branding_public_read"
  on storage.objects for select
  using (bucket_id = 'branding');
