-- ============================================================
-- Hardcode prefisso invoice: PREV per preventivi, FATT per fatture
-- (rimuove la dipendenza da profiles.invoice_prefix nella RPC)
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

  perform pg_advisory_xact_lock(
    hashtextextended(v_owner::text || p_kind::text || v_year::text, 0)
  );

  v_prefix := case when p_kind = 'fattura' then 'FATT' else 'PREV' end;

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

revoke execute on function public.create_invoice_draft(uuid, invoice_kind) from anon;
grant execute on function public.create_invoice_draft(uuid, invoice_kind) to authenticated;
