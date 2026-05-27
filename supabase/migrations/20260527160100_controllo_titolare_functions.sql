-- ============================================================
-- Funzioni che usano il nuovo stadio 'controllo_titolare'.
-- (separata da 20260527160000 perché il valore enum è usabile solo dopo commit)
-- ============================================================

-- next_phase: finitura → controllo_titolare → completata.
create or replace function public.next_phase(p_status case_status)
returns case_status
language sql
immutable
set search_path = public
as $$
  select case p_status
    when 'preparazione'       then 'verniciatura'::case_status
    when 'verniciatura'       then 'finitura'::case_status
    when 'finitura'           then 'controllo_titolare'::case_status
    when 'controllo_titolare' then 'completata'::case_status
    else null::case_status
  end
$$;

-- Notifica al titolare quando la pratica entra in 'controllo_titolare' (il
-- finitore ha finito), e pulizia quando ne esce (validata o riportata indietro).
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
  v_link text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_link := '/cases/' || new.id::text;

  -- Uscita da controllo_titolare (validata → completata, o riportata indietro):
  -- rimuovi la notifica pendente.
  if old.status = 'controllo_titolare'
     and new.status is distinct from 'controllo_titolare' then
    delete from public.notifications
    where type = 'case_status_change' and link = v_link;
    return new;
  end if;

  -- Ingresso in controllo_titolare: avvisa il titolare (se non è lui ad averlo fatto).
  if new.status = 'controllo_titolare'
     and old.status is distinct from 'controllo_titolare' then
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

    select full_name into v_customer from public.customers where id = new.customer_id;
    select nullif(concat_ws(' ', make, model, plate), '') into v_vehicle
    from public.vehicles where id = new.vehicle_id;

    delete from public.notifications
    where type = 'case_status_change' and link = v_link;

    insert into public.notifications (owner_id, workshop_id, type, title, body, link)
    values (
      v_owner_id,
      new.workshop_id,
      'case_status_change',
      'Finitura completata, da controllare',
      coalesce(v_customer, 'Cliente')
        || case when v_vehicle is not null then ' · ' || v_vehicle else '' end,
      v_link
    );
    return new;
  end if;

  return new;
end;
$$;
