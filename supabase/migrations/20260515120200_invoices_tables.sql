-- ============================================================
-- INVOICES: preventivi e fatture (kind = preventivo / fattura)
-- ============================================================

create type invoice_kind as enum ('preventivo', 'fattura');
create type invoice_status as enum (
  'bozza',
  'inviato',
  'accettato',
  'rifiutato',
  'pagato',
  'scaduto'
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  number text not null,
  kind invoice_kind not null default 'preventivo',
  status invoice_status not null default 'bozza',
  issued_at date not null default current_date,
  due_at date,
  subtotal numeric(10,2) not null default 0,
  vat_rate numeric(5,2) not null default 22,
  vat_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, number)
);

create index invoices_owner_idx on public.invoices(owner_id);
create index invoices_case_idx on public.invoices(case_id);
create index invoices_customer_idx on public.invoices(customer_id);
create index invoices_status_idx on public.invoices(status);

create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create trigger invoices_set_owner before insert on public.invoices
  for each row execute function public.set_owner_id();

alter table public.invoices enable row level security;

create policy "invoices_owner_select" on public.invoices
  for select to authenticated using (owner_id = auth.uid());
create policy "invoices_owner_insert" on public.invoices
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "invoices_owner_update" on public.invoices
  for update to authenticated using (owner_id = auth.uid());
create policy "invoices_owner_delete" on public.invoices
  for delete to authenticated using (owner_id = auth.uid());

-- ============================================================
-- INVOICE_ITEMS: righe del preventivo/fattura
-- ============================================================

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  line_total numeric(10,2) not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index invoice_items_invoice_idx on public.invoice_items(invoice_id);
create index invoice_items_owner_idx on public.invoice_items(owner_id);

create trigger invoice_items_set_owner before insert on public.invoice_items
  for each row execute function public.set_owner_id();

alter table public.invoice_items enable row level security;

create policy "invoice_items_owner_select" on public.invoice_items
  for select to authenticated using (owner_id = auth.uid());
create policy "invoice_items_owner_insert" on public.invoice_items
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "invoice_items_owner_update" on public.invoice_items
  for update to authenticated using (owner_id = auth.uid());
create policy "invoice_items_owner_delete" on public.invoice_items
  for delete to authenticated using (owner_id = auth.uid());

-- ============================================================
-- profiles: dati anagrafici officina per intestare i documenti
-- ============================================================

alter table public.profiles
  add column if not exists vat_number text,           -- P.IVA
  add column if not exists tax_code text,             -- Codice fiscale
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists province text,
  add column if not exists country text default 'IT',
  add column if not exists iban text,
  add column if not exists invoice_prefix text default 'PREV';

-- ============================================================
-- Storage bucket per PDF invoices
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoices',
  'invoices',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "invoices_storage_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "invoices_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "invoices_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "invoices_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- TRIGGER: ricalcola totals della invoice quando items cambiano
-- ============================================================

create or replace function public.recalc_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv_id uuid;
  inv_subtotal numeric(10,2);
  inv_vat_rate numeric(5,2);
  inv_vat numeric(10,2);
  inv_total numeric(10,2);
begin
  inv_id := coalesce(new.invoice_id, old.invoice_id);

  select coalesce(sum(line_total), 0) into inv_subtotal
  from public.invoice_items
  where invoice_id = inv_id;

  select vat_rate into inv_vat_rate
  from public.invoices
  where id = inv_id;

  inv_vat := round(inv_subtotal * inv_vat_rate / 100, 2);
  inv_total := inv_subtotal + inv_vat;

  update public.invoices
  set subtotal = inv_subtotal,
      vat_amount = inv_vat,
      total = inv_total
  where id = inv_id;

  return new;
end;
$$;

create trigger invoice_items_recalc_ai after insert on public.invoice_items
  for each row execute function public.recalc_invoice_totals();
create trigger invoice_items_recalc_au after update on public.invoice_items
  for each row execute function public.recalc_invoice_totals();
create trigger invoice_items_recalc_ad after delete on public.invoice_items
  for each row execute function public.recalc_invoice_totals();
