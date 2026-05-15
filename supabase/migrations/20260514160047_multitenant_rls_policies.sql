-- ============================================================
-- RLS POLICIES: ogni utente vede solo i propri dati
-- ============================================================

drop policy if exists "leads_all_authenticated" on public.leads;
drop policy if exists "customers_all_authenticated" on public.customers;
drop policy if exists "cases_all_authenticated" on public.cases;
drop policy if exists "documents_all_authenticated" on public.documents;
drop policy if exists "notes_all_authenticated" on public.notes;

-- LEADS
create policy "leads_owner_select" on public.leads
  for select to authenticated using (owner_id = auth.uid());
create policy "leads_owner_insert" on public.leads
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "leads_owner_update" on public.leads
  for update to authenticated using (owner_id = auth.uid());
create policy "leads_owner_delete" on public.leads
  for delete to authenticated using (owner_id = auth.uid());

-- CUSTOMERS
create policy "customers_owner_select" on public.customers
  for select to authenticated using (owner_id = auth.uid());
create policy "customers_owner_insert" on public.customers
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "customers_owner_update" on public.customers
  for update to authenticated using (owner_id = auth.uid());
create policy "customers_owner_delete" on public.customers
  for delete to authenticated using (owner_id = auth.uid());

-- CASES
create policy "cases_owner_select" on public.cases
  for select to authenticated using (owner_id = auth.uid());
create policy "cases_owner_insert" on public.cases
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "cases_owner_update" on public.cases
  for update to authenticated using (owner_id = auth.uid());
create policy "cases_owner_delete" on public.cases
  for delete to authenticated using (owner_id = auth.uid());

-- DOCUMENTS
create policy "documents_owner_select" on public.documents
  for select to authenticated using (owner_id = auth.uid());
create policy "documents_owner_insert" on public.documents
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "documents_owner_update" on public.documents
  for update to authenticated using (owner_id = auth.uid());
create policy "documents_owner_delete" on public.documents
  for delete to authenticated using (owner_id = auth.uid());

-- NOTES
create policy "notes_owner_select" on public.notes
  for select to authenticated using (owner_id = auth.uid());
create policy "notes_owner_insert" on public.notes
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "notes_owner_update" on public.notes
  for update to authenticated using (owner_id = auth.uid());
create policy "notes_owner_delete" on public.notes
  for delete to authenticated using (owner_id = auth.uid());
