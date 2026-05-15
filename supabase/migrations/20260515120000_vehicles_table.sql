-- ============================================================
-- VEHICLES: entità separata legata al cliente
-- Un cliente può avere più veicoli; una pratica si riferisce
-- a uno specifico veicolo.
-- ============================================================

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  make text,
  model text,
  plate text,
  vin text,
  year int,
  color text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_owner_idx on public.vehicles(owner_id);
create index vehicles_customer_idx on public.vehicles(customer_id);
create index vehicles_plate_idx on public.vehicles(plate);

create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

create trigger vehicles_set_owner before insert on public.vehicles
  for each row execute function public.set_owner_id();

alter table public.vehicles enable row level security;

create policy "vehicles_owner_select" on public.vehicles
  for select to authenticated using (owner_id = auth.uid());
create policy "vehicles_owner_insert" on public.vehicles
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "vehicles_owner_update" on public.vehicles
  for update to authenticated using (owner_id = auth.uid());
create policy "vehicles_owner_delete" on public.vehicles
  for delete to authenticated using (owner_id = auth.uid());

-- ============================================================
-- cases: aggiungere FK vehicle_id e migrare dati legacy
-- ============================================================

alter table public.cases
  add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null;

create index if not exists cases_vehicle_idx on public.cases(vehicle_id);

-- Backfill: per ogni case con dati vehicle inline, crea una vehicle e collega
do $$
declare
  c record;
  v_id uuid;
begin
  for c in
    select id, customer_id, owner_id, vehicle_make, vehicle_model, vehicle_plate
    from public.cases
    where (vehicle_make is not null or vehicle_model is not null or vehicle_plate is not null)
      and vehicle_id is null
  loop
    insert into public.vehicles (owner_id, customer_id, make, model, plate)
    values (c.owner_id, c.customer_id, c.vehicle_make, c.vehicle_model, c.vehicle_plate)
    returning id into v_id;

    update public.cases set vehicle_id = v_id where id = c.id;
  end loop;
end $$;

-- Drop colonne legacy (i dati sono ora in public.vehicles)
alter table public.cases
  drop column if exists vehicle_make,
  drop column if exists vehicle_model,
  drop column if exists vehicle_plate;
