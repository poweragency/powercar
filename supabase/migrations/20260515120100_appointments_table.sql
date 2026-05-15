-- ============================================================
-- APPOINTMENTS: calendario appuntamenti officina
-- ============================================================

create type appointment_kind as enum (
  'accettazione',
  'consegna',
  'sopralluogo',
  'lavorazione',
  'altro'
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  case_id uuid references public.cases(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  title text not null,
  kind appointment_kind not null default 'altro',
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_owner_idx on public.appointments(owner_id);
create index appointments_starts_at_idx on public.appointments(starts_at);
create index appointments_case_idx on public.appointments(case_id);
create index appointments_customer_idx on public.appointments(customer_id);

create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

create trigger appointments_set_owner before insert on public.appointments
  for each row execute function public.set_owner_id();

alter table public.appointments enable row level security;

create policy "appointments_owner_select" on public.appointments
  for select to authenticated using (owner_id = auth.uid());
create policy "appointments_owner_insert" on public.appointments
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "appointments_owner_update" on public.appointments
  for update to authenticated using (owner_id = auth.uid());
create policy "appointments_owner_delete" on public.appointments
  for delete to authenticated using (owner_id = auth.uid());
