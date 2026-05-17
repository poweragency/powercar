-- ============================================================
-- Aggiorna le RPC residue a workshop_id (le ultime ferme su owner_id).
--
-- Prima di questa migration:
--   - get_dashboard_stats: lo staff vedeva dashboard a zero (filtro
--     owner_id = auth.uid()).
--   - create_invoice_draft: lo staff riceveva 'forbidden' aprendo un
--     preventivo/fattura su una pratica dell'officina.
--   - save_invoice_items: lo staff non poteva modificare righe di
--     un'invoice esistente.
--
-- Tutte e tre ora autorizzano via current_workshop_id() (membership
-- nell'officina), non più via ownership della singola riga.
-- ============================================================

-- ------------------------------------------------------------
-- 1) get_dashboard_stats — workshop-aware + esclude archiviate
-- ------------------------------------------------------------
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
    where status in ('preventivo', 'attesa_pezzi', 'lavorazione')
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
    'open_cases_total', (select count(*) from cases_filtered where status in ('preventivo', 'attesa_pezzi', 'lavorazione')),
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
$$;

grant execute on function public.get_dashboard_stats(int) to authenticated;

-- ------------------------------------------------------------
-- 2) create_invoice_draft — autorizza su workshop, numera per workshop
-- ------------------------------------------------------------
create or replace function public.create_invoice_draft(
  p_case_id uuid,
  p_kind invoice_kind
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid := public.current_workshop_id();
  v_case record;
  v_prefix text;
  v_year int := extract(year from current_date);
  v_count int;
  v_number text;
  v_invoice_id uuid;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;
  if v_ws is null then
    raise exception 'no_workshop';
  end if;

  select id, customer_id, workshop_id into v_case
  from public.cases
  where id = p_case_id;

  if v_case.id is null then
    raise exception 'case_not_found';
  end if;
  if v_case.workshop_id is distinct from v_ws then
    raise exception 'forbidden';
  end if;

  -- lock per evitare race condition sulla numerazione progressiva
  -- (per workshop / kind / anno).
  perform pg_advisory_xact_lock(
    hashtextextended(v_ws::text || p_kind::text || v_year::text, 0)
  );

  v_prefix := case when p_kind = 'fattura' then 'FATT' else 'PREV' end;

  select count(*) into v_count
  from public.invoices
  where workshop_id = v_ws
    and kind = p_kind
    and extract(year from issued_at) = v_year;

  v_number := v_prefix || '-' || v_year::text || '-' || lpad((v_count + 1)::text, 3, '0');

  insert into public.invoices (
    workshop_id, owner_id, case_id, customer_id, number, kind, status
  )
  values (
    v_ws, v_uid, v_case.id, v_case.customer_id, v_number, p_kind, 'bozza'
  )
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

revoke execute on function public.create_invoice_draft(uuid, invoice_kind) from anon;
grant execute on function public.create_invoice_draft(uuid, invoice_kind) to authenticated;

-- ------------------------------------------------------------
-- 3) save_invoice_items — autorizza su workshop dell'invoice
-- ------------------------------------------------------------
create or replace function public.save_invoice_items(
  p_invoice_id uuid,
  p_items jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid := public.current_workshop_id();
  v_invoice_ws uuid;
  v_item jsonb;
  v_idx int := 0;
begin
  if v_ws is null then
    raise exception 'unauthenticated';
  end if;

  select workshop_id into v_invoice_ws
  from public.invoices where id = p_invoice_id;

  if v_invoice_ws is null then
    raise exception 'invoice_not_found';
  end if;
  if v_invoice_ws is distinct from v_ws then
    raise exception 'forbidden';
  end if;

  delete from public.invoice_items where invoice_id = p_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.invoice_items (
      workshop_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      line_total,
      position
    ) values (
      v_ws,
      p_invoice_id,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      round(
        ((v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric)::numeric,
        2
      ),
      v_idx
    );
    v_idx := v_idx + 1;
  end loop;
end;
$$;

revoke execute on function public.save_invoice_items(uuid, jsonb) from anon;
grant execute on function public.save_invoice_items(uuid, jsonb) to authenticated;
