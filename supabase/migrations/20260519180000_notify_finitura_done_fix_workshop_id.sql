-- Fix: la notifica generata dal trigger notify_finitura_done non
-- popolava workshop_id, che è NOT NULL su public.notifications dal
-- 20260516230000_workshop_id_business_tables. Risultato: lo staff
-- riceveva "Salvataggio fallito - null value in column workshop_id..."
-- quando concludeva la finitura. Aggiungiamo new.workshop_id nella
-- insert per allinearci al pattern usato dagli altri trigger di
-- notifica (es. notify_new_lead).

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
  if old.status is not distinct from new.status then
    return new;
  end if;
  if old.status in ('completata', 'consegnata', 'liquidato') then
    return new;
  end if;
  if new.status not in ('completata', 'consegnata', 'liquidato') then
    return new;
  end if;

  select * into a from public.audit_actor_info();
  if a.role = 'owner' then
    return new;
  end if;

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

  insert into public.notifications (owner_id, workshop_id, type, title, body, link)
  values (
    v_owner_id,
    new.workshop_id,
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
