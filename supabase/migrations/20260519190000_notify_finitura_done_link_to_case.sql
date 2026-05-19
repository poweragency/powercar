-- Lega la notifica "Lavorazione conclusa" al cambio di stato della
-- pratica:
--  - se la pratica torna prima della finitura, la notifica scompare
--    (delete in trigger);
--  - se viene "conclusa" di nuovo, c'è una sola notifica fresca per
--    pratica (delete-before-insert), niente accumulo.
-- Replica identity full sulla tabella notifications così Supabase
-- Realtime invia l'intera riga old su DELETE (serve al filtro
-- owner_id=eq.X lato NotificationBell).

alter table public.notifications replica identity full;

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
  v_was_post boolean;
  v_is_post boolean;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_was_post := old.status in ('completata', 'consegnata', 'liquidato');
  v_is_post := new.status in ('completata', 'consegnata', 'liquidato');
  v_link := '/cases/' || new.id::text;

  -- Regressione (post-produzione -> produzione): rimuovi le notifiche
  -- pendenti per questa pratica. Vale per qualsiasi attore.
  if v_was_post and not v_is_post then
    delete from public.notifications
    where type = 'case_status_change' and link = v_link;
    return new;
  end if;

  -- Non c'è transizione attraverso la soglia: niente da fare.
  if v_was_post or not v_is_post then
    return new;
  end if;

  -- Da qui: lo stato è passato dalla produzione al post-produzione.
  -- Niente notifica se è stato l'owner stesso a farlo (no self-noise).
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

  -- Insert idempotente: prima ripulisci eventuali duplicati per
  -- questa pratica, poi inseriscine una fresca.
  delete from public.notifications
  where type = 'case_status_change' and link = v_link;

  insert into public.notifications (owner_id, workshop_id, type, title, body, link)
  values (
    v_owner_id,
    new.workshop_id,
    'case_status_change',
    'Lavorazione conclusa — passa al titolare',
    coalesce(v_customer, 'Cliente')
      || case when v_vehicle is not null then ' · ' || v_vehicle else '' end
      || ' · Finitura completata.',
    v_link
  );

  return new;
end;
$$;

-- One-shot cleanup: tieni solo la notifica più recente per ciascuna
-- pratica nelle case_status_change, eliminando l'accumulo storico
-- (es. i 3 doppioni visti il 2026-05-19).
delete from public.notifications n1
using public.notifications n2
where n1.type = 'case_status_change'
  and n2.type = 'case_status_change'
  and n1.link = n2.link
  and n1.id <> n2.id
  and n1.created_at < n2.created_at;
