-- ============================================================
-- Dashboard: "completate" = solo liquidato; "aperte" = tutto il resto non
-- liquidato. Una pratica è considerata chiusa SOLO quando incassata.
-- (Sostituisce la definizione precedente di 20260527150000.)
-- ============================================================

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
           (p_to + 1)::timestamptz as ts_to
  ),
  bucket_days as (
    select generate_series(p_from, p_to, interval '1 day')::date as day
  ),

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

  cases_win as (
    select c.* from public.cases c, ws, bounds
    where c.workshop_id = ws.id and c.archived_at is null
      and c.created_at >= bounds.ts_from and c.created_at < bounds.ts_to
  ),

  -- "Aperta" = tutto ciò che non è liquidato (lavorazione, controllo, completata,
  -- consegnata: la pratica non è ancora chiusa finché non è incassata).
  open_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_win
    where status <> 'liquidato'
    group by 1
  ),
  open_cum as (
    select b.day,
           coalesce(sum(coalesce(od.n, 0))
             over (order by b.day rows between unbounded preceding and current row), 0)::int as total
    from bucket_days b left join open_daily od on od.day = b.day
  ),

  -- "Completata" lato dashboard = liquidato (pratica chiusa e incassata).
  completed_daily as (
    select date_trunc('day', created_at)::date as day, count(*)::int as n
    from cases_win
    where status = 'liquidato'
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
    'open_cases_total', (select count(*) from cases_win where status <> 'liquidato'),
    'completed_cases_total', (select count(*) from cases_win where status = 'liquidato'),
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
