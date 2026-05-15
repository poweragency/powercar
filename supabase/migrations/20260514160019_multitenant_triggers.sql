-- ============================================================
-- TRIGGER: auto-set owner_id = auth.uid() su tutti gli INSERT
-- Così il frontend non deve passarlo esplicitamente.
-- ============================================================

create or replace function public.set_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists leads_set_owner on public.leads;
create trigger leads_set_owner before insert on public.leads
  for each row execute function public.set_owner_id();

drop trigger if exists customers_set_owner on public.customers;
create trigger customers_set_owner before insert on public.customers
  for each row execute function public.set_owner_id();

drop trigger if exists cases_set_owner on public.cases;
create trigger cases_set_owner before insert on public.cases
  for each row execute function public.set_owner_id();

drop trigger if exists documents_set_owner on public.documents;
create trigger documents_set_owner before insert on public.documents
  for each row execute function public.set_owner_id();

drop trigger if exists notes_set_owner on public.notes;
create trigger notes_set_owner before insert on public.notes
  for each row execute function public.set_owner_id();

-- ============================================================
-- TRIGGER: lead → customer → case propaga owner_id
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
      insert into public.customers (full_name, phone, email, lead_id, owner_id)
      values (new.full_name, new.phone, new.email, new.id, new.owner_id)
      returning id into new_customer_id;

      insert into public.cases (customer_id, status, owner_id)
      values (new_customer_id, 'preventivo', new.owner_id);
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- TRIGGER: handle_new_user → legge workshop_name da metadata
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, workshop_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'workshop_name', 'La mia carrozzeria')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
