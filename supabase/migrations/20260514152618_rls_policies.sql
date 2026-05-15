alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.customers enable row level security;
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.notes enable row level security;

create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "leads_all_authenticated" on public.leads
  for all to authenticated using (true) with check (true);

create policy "customers_all_authenticated" on public.customers
  for all to authenticated using (true) with check (true);

create policy "cases_all_authenticated" on public.cases
  for all to authenticated using (true) with check (true);

create policy "documents_all_authenticated" on public.documents
  for all to authenticated using (true) with check (true);

create policy "notes_all_authenticated" on public.notes
  for all to authenticated using (true) with check (true);
