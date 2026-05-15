insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do nothing;

create policy "documents_storage_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents');

create policy "documents_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents');

create policy "documents_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents');

create policy "documents_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents');
