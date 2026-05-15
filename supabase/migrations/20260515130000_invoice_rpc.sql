-- ============================================================
-- RPC: create_invoice_draft - atomica con advisory lock
-- Evita race condition sulla numerazione quando due click
-- contemporanei generano lo stesso numero.
-- ============================================================

create or replace function public.create_invoice_draft(
  p_case_id uuid,
  p_kind invoice_kind
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_case record;
  v_prefix text;
  v_year int := extract(year from current_date);
  v_count int;
  v_number text;
  v_invoice_id uuid;
begin
  if v_owner is null then
    raise exception 'unauthenticated';
  end if;

  select id, customer_id, owner_id into v_case
  from public.cases
  where id = p_case_id;

  if v_case.id is null then
    raise exception 'case_not_found';
  end if;
  if v_case.owner_id is distinct from v_owner then
    raise exception 'forbidden';
  end if;

  -- Advisory xact lock per (owner, year, kind) — serializza i create concorrenti
  perform pg_advisory_xact_lock(
    hashtextextended(v_owner::text || p_kind::text || v_year::text, 0)
  );

  select coalesce(invoice_prefix, 'PREV') into v_prefix
  from public.profiles where id = v_owner;

  if p_kind = 'fattura' then
    v_prefix := 'FATT';
  end if;

  select count(*) into v_count
  from public.invoices
  where owner_id = v_owner
    and kind = p_kind
    and extract(year from issued_at) = v_year;

  v_number := v_prefix || '-' || v_year::text || '-' || lpad((v_count + 1)::text, 3, '0');

  insert into public.invoices (
    owner_id, case_id, customer_id, number, kind, status
  )
  values (
    v_owner, v_case.id, v_case.customer_id, v_number, p_kind, 'bozza'
  )
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

grant execute on function public.create_invoice_draft(uuid, invoice_kind) to authenticated;

-- ============================================================
-- RPC: save_invoice_items - delete+insert atomico
-- Garantisce che le righe non vengano perse se l'insert fallisce.
-- ============================================================

create or replace function public.save_invoice_items(
  p_invoice_id uuid,
  p_items jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_invoice_owner uuid;
  v_item jsonb;
  v_idx int := 0;
begin
  if v_owner is null then
    raise exception 'unauthenticated';
  end if;

  select owner_id into v_invoice_owner
  from public.invoices where id = p_invoice_id;

  if v_invoice_owner is null then
    raise exception 'invoice_not_found';
  end if;
  if v_invoice_owner is distinct from v_owner then
    raise exception 'forbidden';
  end if;

  delete from public.invoice_items where invoice_id = p_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.invoice_items (
      owner_id, invoice_id, description, quantity, unit_price, line_total, position
    )
    values (
      v_owner,
      p_invoice_id,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      round(((v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric)::numeric, 2),
      v_idx
    );
    v_idx := v_idx + 1;
  end loop;
end;
$$;

grant execute on function public.save_invoice_items(uuid, jsonb) to authenticated;
