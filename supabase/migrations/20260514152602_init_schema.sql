-- ============================================================
-- ENUMS
-- ============================================================

create type lead_status as enum (
  'nuovo',
  'contattato',
  'preventivo',
  'cliente',
  'perso'
);

create type case_status as enum (
  'preventivo',
  'attesa_pezzi',
  'lavorazione',
  'completata',
  'consegnata'
);

-- ============================================================
-- profiles (estende auth.users)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- leads
-- ============================================================

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  message text,
  source text default 'manual',
  status lead_status not null default 'nuovo',
  position int not null default 0,
  fb_lead_id text unique,
  fb_form_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads(status);
create index leads_created_at_idx on public.leads(created_at desc);

-- ============================================================
-- customers
-- ============================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_name_idx on public.customers(full_name);

-- ============================================================
-- cases (pratiche officina)
-- ============================================================

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  vehicle_make text,
  vehicle_model text,
  vehicle_plate text,
  insurance_company text,
  price numeric(10,2),
  status case_status not null default 'preventivo',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cases_customer_idx on public.cases(customer_id);
create index cases_status_idx on public.cases(status);

-- ============================================================
-- documents
-- ============================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

create index documents_case_idx on public.documents(case_id);

-- ============================================================
-- notes (su lead o case)
-- ============================================================

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  check (
    (lead_id is not null and case_id is null) or
    (lead_id is null and case_id is not null)
  )
);

create index notes_lead_idx on public.notes(lead_id);
create index notes_case_idx on public.notes(case_id);

-- ============================================================
-- TRIGGER: updated_at auto
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create trigger cases_updated_at before update on public.cases
  for each row execute function public.set_updated_at();

-- ============================================================
-- TRIGGER: lead -> cliente -> pratica automatica
-- ============================================================

create or replace function public.handle_lead_to_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_customer_id uuid;
begin
  if new.status = 'cliente' and (old.status is distinct from 'cliente') then
    select id into new_customer_id
    from public.customers
    where lead_id = new.id
    limit 1;

    if new_customer_id is null then
      insert into public.customers (full_name, phone, email, lead_id)
      values (new.full_name, new.phone, new.email, new.id)
      returning id into new_customer_id;

      insert into public.cases (customer_id, status)
      values (new_customer_id, 'preventivo');
    end if;
  end if;
  return new;
end;
$$;

create trigger lead_to_customer_trigger
  after update on public.leads
  for each row execute function public.handle_lead_to_customer();

-- ============================================================
-- TRIGGER: auto-create profile alla registrazione
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
