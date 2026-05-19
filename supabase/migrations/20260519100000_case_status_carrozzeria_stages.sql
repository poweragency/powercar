-- Sostituisce gli stati pratica con il flusso carrozzeria:
-- preparazione, verniciatura, finitura, completata, consegnata.

-- 1) Nuovo tipo
create type case_status_new as enum (
  'preparazione',
  'verniciatura',
  'finitura',
  'completata',
  'consegnata'
);

-- 2) Migra colonna cases.status sul nuovo tipo
alter table public.cases
  alter column status drop default;

alter table public.cases
  alter column status type case_status_new
  using (
    case status::text
      when 'preventivo'    then 'preparazione'::case_status_new
      when 'attesa_pezzi'  then 'preparazione'::case_status_new
      when 'lavorazione'   then 'verniciatura'::case_status_new
      when 'completata'    then 'completata'::case_status_new
      when 'consegnata'    then 'consegnata'::case_status_new
    end
  );

alter table public.cases
  alter column status set default 'preparazione'::case_status_new;

-- 3) Drop vecchio tipo e rinomina
drop type public.case_status;
alter type public.case_status_new rename to case_status;

-- 4) Funzioni che referenziano i vecchi valori

create or replace function public.handle_lead_to_customer()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
      values (new_customer_id, 'preparazione', new.owner_id);
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.delete_lead_cascade(p_lead_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_ws uuid := public.current_workshop_id();
begin
  if v_ws is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (
    select 1 from public.leads
    where id = p_lead_id and workshop_id = v_ws
  ) then
    raise exception 'forbidden';
  end if;

  update public.cases
  set archived_at = now(),
      archived_reason = 'lead_deleted'
  where status in ('preparazione', 'verniciatura', 'finitura')
    and archived_at is null
    and customer_id in (
      select id from public.customers
      where lead_id = p_lead_id and workshop_id = v_ws
    )
    and workshop_id = v_ws;

  delete from public.leads
  where id = p_lead_id and workshop_id = v_ws;
end;
$function$;

create or replace function public.admin_get_workshops()
returns table(
  id uuid, name text, vat_number text, tax_code text, address text, city text,
  postal_code text, province text, owner_email text, owner_full_name text,
  owner_phone text, facebook_connected boolean, members_count bigint,
  staff_count bigint, leads_count bigint, cases_count bigint,
  cases_open_count bigint, revenue_total numeric, invoices_count bigint,
  documents_count bigint, registered_at timestamp with time zone,
  last_activity_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    w.id, w.name, w.vat_number, w.tax_code, w.address, w.city,
    w.postal_code, w.province,
    (select u.email::text from public.profiles op
       join auth.users u on u.id = op.id
       where op.workshop_id = w.id and op.role = 'owner'
       order by op.created_at asc limit 1) as owner_email,
    (select op.full_name from public.profiles op
       where op.workshop_id = w.id and op.role = 'owner'
       order by op.created_at asc limit 1) as owner_full_name,
    w.phone as owner_phone,
    (w.fb_page_id is not null) as facebook_connected,
    (select count(*) from public.profiles where workshop_id = w.id) as members_count,
    (select count(*) from public.profiles where workshop_id = w.id and role = 'staff') as staff_count,
    (select count(*) from public.leads where workshop_id = w.id) as leads_count,
    (select count(*) from public.cases where workshop_id = w.id) as cases_count,
    (select count(*) from public.cases
       where workshop_id = w.id
       and status in ('preparazione','verniciatura','finitura')) as cases_open_count,
    (select coalesce(sum(price), 0) from public.cases where workshop_id = w.id) as revenue_total,
    (select count(*) from public.invoices where workshop_id = w.id) as invoices_count,
    (select count(*) from public.documents where workshop_id = w.id) as documents_count,
    w.created_at as registered_at,
    (select max(u.last_sign_in_at) from public.profiles op
       join auth.users u on u.id = op.id
       where op.workshop_id = w.id) as last_activity_at
  from public.workshops w
  order by w.created_at desc;
end;
$function$;

create or replace function public.get_dashboard_stats(p_days integer default 30)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with
  ws as (select public.current_workshop_id() as id),
  bucket_days as (
    select generate_series(
      (current_date - (p_days - 1))::date,
      current_date::date,
      interval '1 day'
    )::date as day
  ),
  leads_daily as (
    select date_trunc('day', l.created_at)::date as day, count(*)::int as n
    from public.leads l, ws
    where l.workshop_id = ws.id
      and l.created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  customers_daily as (
    select date_trunc('day', c.created_at)::date as day, count(*)::int as n
    from public.customers c, ws
    where c.workshop_id = ws.id
      and c.created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  cases_filtered as (
    select c.* from public.cases c, ws
    where c.workshop_id = ws.id and c.archived_at is null
  ),
  open_cases_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_filtered
    where status in ('preparazione', 'verniciatura', 'finitura')
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  completed_cases_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_filtered
    where status in ('completata', 'consegnata')
      and created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  revenue_daily as (
    select date_trunc('day', created_at)::date as day,
           coalesce(sum(price), 0)::numeric as total
    from cases_filtered
    where created_at >= (current_date - (p_days - 1))
    group by 1
  ),
  status_counts as (
    select status, count(*)::int as n
    from cases_filtered
    group by status
  )
  select jsonb_build_object(
    'leads_total', (select count(*) from public.leads l, ws where l.workshop_id = ws.id),
    'customers_total', (select count(*) from public.customers c, ws where c.workshop_id = ws.id),
    'open_cases_total', (select count(*) from cases_filtered where status in ('preparazione', 'verniciatura', 'finitura')),
    'completed_cases_total', (select count(*) from cases_filtered where status in ('completata', 'consegnata')),
    'revenue_total', (select coalesce(sum(price), 0) from cases_filtered),
    'revenue_collected', (select coalesce(sum(price), 0) from cases_filtered where status = 'consegnata'),
    'leads_spark', (
      select coalesce(jsonb_agg(coalesce(l.n, 0) order by b.day), '[]'::jsonb)
      from bucket_days b left join leads_daily l on l.day = b.day
    ),
    'customers_spark', (
      select coalesce(jsonb_agg(coalesce(c.n, 0) order by b.day), '[]'::jsonb)
      from bucket_days b left join customers_daily c on c.day = b.day
    ),
    'open_cases_spark', (
      select coalesce(jsonb_agg(coalesce(o.n, 0) order by b.day), '[]'::jsonb)
      from bucket_days b left join open_cases_daily o on o.day = b.day
    ),
    'completed_spark', (
      select coalesce(jsonb_agg(coalesce(c.n, 0) order by b.day), '[]'::jsonb)
      from bucket_days b left join completed_cases_daily c on c.day = b.day
    ),
    'revenue_daily', (
      select coalesce(jsonb_agg(coalesce(r.total, 0)::numeric order by b.day), '[]'::jsonb)
      from bucket_days b left join revenue_daily r on r.day = b.day
    ),
    'status_counts', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from status_counts
    )
  );
$function$;
