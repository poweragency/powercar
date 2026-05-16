-- ============================================================
-- Performance hardening
-- 1) Indici su foreign key mancanti
-- 2) RLS policies con (select auth.uid()) invece di auth.uid()
-- ============================================================

-- 1) Indici FK mancanti
create index if not exists appointments_vehicle_id_idx
  on public.appointments(vehicle_id);
create index if not exists customers_lead_id_idx
  on public.customers(lead_id);
create index if not exists documents_uploaded_by_idx
  on public.documents(uploaded_by);
create index if not exists notes_author_id_idx
  on public.notes(author_id);

-- 2) RLS policies: sostituisce auth.uid() con (select auth.uid()) per evitare
--    re-evaluation per ogni riga.

-- Helper macro: per ogni tabella + 4 policies CRUD.

-- LEADS
drop policy if exists "leads_owner_select" on public.leads;
drop policy if exists "leads_owner_insert" on public.leads;
drop policy if exists "leads_owner_update" on public.leads;
drop policy if exists "leads_owner_delete" on public.leads;
create policy "leads_owner_select" on public.leads for select
  using (owner_id = (select auth.uid()));
create policy "leads_owner_insert" on public.leads for insert
  with check (owner_id = (select auth.uid()));
create policy "leads_owner_update" on public.leads for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "leads_owner_delete" on public.leads for delete
  using (owner_id = (select auth.uid()));

-- CUSTOMERS
drop policy if exists "customers_owner_select" on public.customers;
drop policy if exists "customers_owner_insert" on public.customers;
drop policy if exists "customers_owner_update" on public.customers;
drop policy if exists "customers_owner_delete" on public.customers;
create policy "customers_owner_select" on public.customers for select
  using (owner_id = (select auth.uid()));
create policy "customers_owner_insert" on public.customers for insert
  with check (owner_id = (select auth.uid()));
create policy "customers_owner_update" on public.customers for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "customers_owner_delete" on public.customers for delete
  using (owner_id = (select auth.uid()));

-- CASES
drop policy if exists "cases_owner_select" on public.cases;
drop policy if exists "cases_owner_insert" on public.cases;
drop policy if exists "cases_owner_update" on public.cases;
drop policy if exists "cases_owner_delete" on public.cases;
create policy "cases_owner_select" on public.cases for select
  using (owner_id = (select auth.uid()));
create policy "cases_owner_insert" on public.cases for insert
  with check (owner_id = (select auth.uid()));
create policy "cases_owner_update" on public.cases for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "cases_owner_delete" on public.cases for delete
  using (owner_id = (select auth.uid()));

-- DOCUMENTS
drop policy if exists "documents_owner_select" on public.documents;
drop policy if exists "documents_owner_insert" on public.documents;
drop policy if exists "documents_owner_update" on public.documents;
drop policy if exists "documents_owner_delete" on public.documents;
create policy "documents_owner_select" on public.documents for select
  using (owner_id = (select auth.uid()));
create policy "documents_owner_insert" on public.documents for insert
  with check (owner_id = (select auth.uid()));
create policy "documents_owner_update" on public.documents for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "documents_owner_delete" on public.documents for delete
  using (owner_id = (select auth.uid()));

-- NOTES
drop policy if exists "notes_owner_select" on public.notes;
drop policy if exists "notes_owner_insert" on public.notes;
drop policy if exists "notes_owner_update" on public.notes;
drop policy if exists "notes_owner_delete" on public.notes;
create policy "notes_owner_select" on public.notes for select
  using (owner_id = (select auth.uid()));
create policy "notes_owner_insert" on public.notes for insert
  with check (owner_id = (select auth.uid()));
create policy "notes_owner_update" on public.notes for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "notes_owner_delete" on public.notes for delete
  using (owner_id = (select auth.uid()));

-- VEHICLES
drop policy if exists "vehicles_owner_select" on public.vehicles;
drop policy if exists "vehicles_owner_insert" on public.vehicles;
drop policy if exists "vehicles_owner_update" on public.vehicles;
drop policy if exists "vehicles_owner_delete" on public.vehicles;
create policy "vehicles_owner_select" on public.vehicles for select
  using (owner_id = (select auth.uid()));
create policy "vehicles_owner_insert" on public.vehicles for insert
  with check (owner_id = (select auth.uid()));
create policy "vehicles_owner_update" on public.vehicles for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "vehicles_owner_delete" on public.vehicles for delete
  using (owner_id = (select auth.uid()));

-- APPOINTMENTS
drop policy if exists "appointments_owner_select" on public.appointments;
drop policy if exists "appointments_owner_insert" on public.appointments;
drop policy if exists "appointments_owner_update" on public.appointments;
drop policy if exists "appointments_owner_delete" on public.appointments;
create policy "appointments_owner_select" on public.appointments for select
  using (owner_id = (select auth.uid()));
create policy "appointments_owner_insert" on public.appointments for insert
  with check (owner_id = (select auth.uid()));
create policy "appointments_owner_update" on public.appointments for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "appointments_owner_delete" on public.appointments for delete
  using (owner_id = (select auth.uid()));

-- INVOICES
drop policy if exists "invoices_owner_select" on public.invoices;
drop policy if exists "invoices_owner_insert" on public.invoices;
drop policy if exists "invoices_owner_update" on public.invoices;
drop policy if exists "invoices_owner_delete" on public.invoices;
create policy "invoices_owner_select" on public.invoices for select
  using (owner_id = (select auth.uid()));
create policy "invoices_owner_insert" on public.invoices for insert
  with check (owner_id = (select auth.uid()));
create policy "invoices_owner_update" on public.invoices for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "invoices_owner_delete" on public.invoices for delete
  using (owner_id = (select auth.uid()));

-- INVOICE_ITEMS
drop policy if exists "invoice_items_owner_select" on public.invoice_items;
drop policy if exists "invoice_items_owner_insert" on public.invoice_items;
drop policy if exists "invoice_items_owner_update" on public.invoice_items;
drop policy if exists "invoice_items_owner_delete" on public.invoice_items;
create policy "invoice_items_owner_select" on public.invoice_items for select
  using (owner_id = (select auth.uid()));
create policy "invoice_items_owner_insert" on public.invoice_items for insert
  with check (owner_id = (select auth.uid()));
create policy "invoice_items_owner_update" on public.invoice_items for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "invoice_items_owner_delete" on public.invoice_items for delete
  using (owner_id = (select auth.uid()));

-- PROFILES
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "profiles_select_self_or_admin" on public.profiles for select
  using (id = (select auth.uid()) or (select is_admin()));

-- NOTIFICATIONS
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select
  using (owner_id = (select auth.uid()));
create policy "notifications_update_own" on public.notifications for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "notifications_delete_own" on public.notifications for delete
  using (owner_id = (select auth.uid()));
