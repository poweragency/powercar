-- ============================================================
-- Dashboard con intervallo di date scelto dall'utente.
--
-- Prima: get_dashboard_stats(p_days int) → totali ALL-TIME + spark sugli ultimi
-- N giorni. Ora: get_dashboard_stats(p_from date, p_to date) → TUTTO (lead,
-- clienti, pratiche aperte/completate, fatturati, grafici, stati) filtrato per
-- created_at nell'intervallo [p_from, p_to]. Gli spark/grafici sono cumulativi
-- ENTRO l'intervallo, quindi il valore finale coincide col KPI del periodo.
-- ============================================================

drop function if exists public.get_dashboard_stats(int);

create or replace function public.get_dashboard_stats(p_from date, p_to date)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  with
  ws as (select public.current_workshop_id() as id),
  bounds as (
    select p_from::timestamptz as ts_from,
           (p_to + 1)::timestamptz as ts_to   -- p_to incluso per intero
  ),
  bucket_days as (
    select generate_series(p_from, p_to, interval '1 day')::date as day
  ),

  -- LEAD: nascite giornaliere nell'intervallo + cumulativo entro l'intervallo
  leads_daily as (
    select date_trunc('day', l.created_at)::date as day, count(*)::int as n
    from public.leads l, ws, bounds
    where l.workshop_id = ws.id
      and l.created_at >= bounds.ts_from and l.created_at < bounds.ts_to
    group by 1
  ),
  leads_cum as (
    select b.day,
           coalesce(sum(coalesce(ld.n, 0))
             over (order by b.day rows between unbounded preceding and current row), 0)::int as total
    from bucket_days b left join leads_daily ld on ld.day = b.day
  ),

  -- CLIENTI
  customers_daily as (
    select date_trunc('day', c.created_at)::date as day, count(*)::int as n
    from public.customers c, ws, bounds
    where c.workshop_id = ws.id
      and c.created_at >= bounds.ts_from and c.created_at < bounds.ts_to
    group by 1
  ),
  customers_cum as (
    select b.day,
           coalesce(sum(coalesce(cd.n, 0))
             over (order by b.day rows between unbounded preceding and current row), 0)::int as total
    from bucket_days b left join customers_daily cd on cd.day = b.day
  ),

  -- Pratiche non archiviate create nell'intervallo
  cases_win as (
    select c.* from public.cases c, ws, bounds
    where c.workshop_id = ws.id and c.archived_at is null
      and c.created_at >= bounds.ts_from and c.created_at < bounds.ts_to
  ),

  open_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_win
    where status in ('preparazione', 'verniciatura', 'finitura')
    group by 1
  ),
  open_cum as (
    select b.day,
           coalesce(sum(coalesce(od.n, 0))
             over (order by b.day rows between unbounded preceding and current row), 0)::int as total
    from bucket_days b left join open_daily od on od.day = b.day
  ),

  completed_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_win
    where status in ('completata', 'consegnata', 'liquidato')
    group by 1
  ),
  completed_cum as (
    select b.day,
           coalesce(sum(coalesce(cd.n, 0))
             over (order by b.day rows between unbounded preceding and current row), 0)::int as total
    from bucket_days b left join completed_daily cd on cd.day = b.day
  ),

  collected_daily as (
    select date_trunc('day', created_at)::date as day, coalesce(sum(price), 0)::numeric as added
    from cases_win
    where status = 'liquidato'
    group by 1
  ),
  revenue_cum as (
    select b.day,
           coalesce(sum(coalesce(cd.added, 0))
             over (order by b.day rows between unbounded preceding and current row), 0)::numeric as total
    from bucket_days b left join collected_daily cd on cd.day = b.day
  ),

  status_counts as (
    select status, count(*)::int as n from cases_win group by status
  )

  select jsonb_build_object(
    'leads_total', (
      select count(*) from public.leads l, ws, bounds
      where l.workshop_id = ws.id and l.created_at >= bounds.ts_from and l.created_at < bounds.ts_to
    ),
    'customers_total', (
      select count(*) from public.customers c, ws, bounds
      where c.workshop_id = ws.id and c.created_at >= bounds.ts_from and c.created_at < bounds.ts_to
    ),
    'open_cases_total', (select count(*) from cases_win where status in ('preparazione', 'verniciatura', 'finitura')),
    'completed_cases_total', (select count(*) from cases_win where status in ('completata', 'consegnata', 'liquidato')),
    'revenue_total', (select coalesce(sum(price), 0) from cases_win),
    'revenue_collected', (select coalesce(sum(price), 0) from cases_win where status = 'liquidato'),
    'leads_spark', (select coalesce(jsonb_agg(total order by day), '[]'::jsonb) from leads_cum),
    'customers_spark', (select coalesce(jsonb_agg(total order by day), '[]'::jsonb) from customers_cum),
    'open_cases_spark', (select coalesce(jsonb_agg(total order by day), '[]'::jsonb) from open_cum),
    'completed_spark', (select coalesce(jsonb_agg(total order by day), '[]'::jsonb) from completed_cum),
    'revenue_daily', (select coalesce(jsonb_agg(total order by day), '[]'::jsonb) from revenue_cum),
    'status_counts', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from status_counts)
  );
$$;
