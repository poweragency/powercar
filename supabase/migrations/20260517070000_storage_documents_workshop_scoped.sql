-- ============================================================
-- Bucket "documents" — policy storage workshop-scoped.
--
-- Prima di questa migration le policy permettevano a QUALSIASI utente
-- autenticato di leggere/scrivere/cancellare/elencare i file in
-- 'documents'. Privacy breach: foto/PDF pratiche visibili tra officine
-- diverse (basta conoscere o enumerare i path).
--
-- Il path dei file uploadati da DocumentPanel è:
--   <uploader_user_id>/<case_id>/<random>.<ext>
--
-- La nuova autorizzazione controlla che il <case_id> nel path (2°
-- segmento) appartenga a una pratica del workshop dell'utente che
-- richiede l'operazione. Cosi' owner + staff dello stesso workshop
-- vedono gli stessi documenti, ma non vedono quelli degli altri.
-- ============================================================

-- 1) Drop policy vecchie aperte
drop policy if exists "documents_storage_read" on storage.objects;
drop policy if exists "documents_storage_insert" on storage.objects;
drop policy if exists "documents_storage_update" on storage.objects;
drop policy if exists "documents_storage_delete" on storage.objects;

-- 2) Helper inline — il case_id è il 2° segmento del path.
--    Lo recuperiamo con storage.foldername(name) che torna un array
--    text[] dei segmenti di directory.

-- 3) Nuove policy workshop-scoped

create policy "documents_workshop_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.cases c
      where c.id::text = (storage.foldername(name))[2]
        and c.workshop_id = public.current_workshop_id()
    )
  );

create policy "documents_workshop_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.cases c
      where c.id::text = (storage.foldername(name))[2]
        and c.workshop_id = public.current_workshop_id()
    )
  );

create policy "documents_workshop_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.cases c
      where c.id::text = (storage.foldername(name))[2]
        and c.workshop_id = public.current_workshop_id()
    )
  );

create policy "documents_workshop_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.cases c
      where c.id::text = (storage.foldername(name))[2]
        and c.workshop_id = public.current_workshop_id()
    )
  );
