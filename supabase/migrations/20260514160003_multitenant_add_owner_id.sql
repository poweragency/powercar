-- ============================================================
-- MULTI-TENANT MIGRATION (opzione A: 1 utente = 1 carrozzeria)
-- ============================================================

-- 1) profiles: workshop_name + dati FB integration
alter table public.profiles
  add column if not exists workshop_name text,
  add column if not exists phone text,
  add column if not exists fb_page_id text,
  add column if not exists fb_page_access_token text,
  add column if not exists fb_verify_token text default encode(gen_random_bytes(16), 'hex');

create unique index if not exists profiles_fb_page_id_unique
  on public.profiles(fb_page_id) where fb_page_id is not null;

-- 2) Aggiungere owner_id a tutte le tabelle business
alter table public.leads
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.customers
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.cases
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.documents
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.notes
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Indici per query veloci
create index if not exists leads_owner_idx on public.leads(owner_id);
create index if not exists customers_owner_idx on public.customers(owner_id);
create index if not exists cases_owner_idx on public.cases(owner_id);
create index if not exists documents_owner_idx on public.documents(owner_id);
create index if not exists notes_owner_idx on public.notes(owner_id);
