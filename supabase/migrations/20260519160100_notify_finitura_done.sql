-- Trigger: quando una pratica supera lo step "finitura" (passa cioè
-- a completata/consegnata/liquidato), notifica l'owner dell'officina
-- nel pannello notifiche. Non logghiamo se l'owner stesso ha fatto la
-- modifica (sarebbe rumore inutile), allineandoci alla stessa logica
-- usata dai trigger di audit.
--
-- Si aggiorna anche get_dashboard_stats per contare 'liquidato' tra
-- le pratiche completate (altrimenti finirebbero senza categoria).

create or replace function public.notify_finitura_done()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_owner_id uuid;
  v_customer text;
  v_vehicle text;
begin
  -- Solo quando lo stato attraversa la soglia "finitura" salendo.
  -- Eviamo doppi colpi: se old è già oltre finitura, non rifiriamo.
  if old.status is not distinct from new.status then
    return new;
  end if;
  if old.status in ('completata', 'consegnata', 'liquidato') then
    return new;
  end if;
  if new.status not in ('completata', 'consegnata', 'liquidato') then
    return new;
  end if;

  -- Salta se l'owner stesso ha fatto la modifica.
  select * into a from public.audit_actor_info();
  if a.role = 'owner' then
    return new;
  end if;

  -- Owner del workshop di destinazione della notifica.
  select id into v_owner_id
  from public.profiles
  where workshop_id = new.workshop_id and role = 'owner'
  order by created_at asc
  limit 1;

  if v_owner_id is null then
    return new;
  end if;

  select full_name into v_customer
  from public.customers where id = new.customer_id;

  select nullif(concat_ws(' ', make, model, plate), '') into v_vehicle
  from public.vehicles where id = new.vehicle_id;

  insert into public.notifications (owner_id, type, title, body, link)
  values (
    v_owner_id,
    'case_status_change',
    'Lavorazione conclusa — passa al titolare',
    coalesce(v_customer, 'Cliente')
      || case when v_vehicle is not null then ' · ' || v_vehicle else '' end
      || ' · Finitura completata.',
    '/cases/' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_finitura_done on public.cases;
create trigger trg_notify_finitura_done
  after update of status on public.cases
  for each row
  execute function public.notify_finitura_done();

-- get_dashboard_stats: includi 'liquidato' tra le completate
-- (revenue_collected resta su 'consegnata' per non cambiare semantica
-- del totale incassato in questa migration).
create or replace function public.get_dashboard_stats(p_days int default 30)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
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
    where status in ('completata', 'consegnata', 'liquidato')
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
    'completed_cases_total', (select count(*) from cases_filtered where status in ('completata', 'consegnata', 'liquidato')),
    'revenue_total', (select coalesce(sum(price), 0) from cases_filtered),
    'revenue_collected', (select coalesce(sum(price), 0) from cases_filtered where status in ('consegnata', 'liquidato')),
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
$$;
