-- Le funzioni di audit non devono loggare le azioni dell'owner:
-- il log esiste per controllare lo staff. Owner azioni = silenzio.

create or replace function public.audit_lead_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  if a.role = 'owner' then return old; end if;
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'lead', old.id, old.full_name);
  return old;
end;
$$;

create or replace function public.audit_customer_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  if a.role = 'owner' then return old; end if;
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'customer', old.id, old.full_name);
  return old;
end;
$$;

create or replace function public.audit_case_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a record;
  v_cust text;
begin
  select * into a from public.audit_actor_info();
  if a.role = 'owner' then return old; end if;
  select c.full_name into v_cust from public.customers c where c.id = old.customer_id;
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'case', old.id,
     coalesce(v_cust, 'Pratica') || ' · ' || old.status);
  return old;
end;
$$;

create or replace function public.audit_vehicle_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  if a.role = 'owner' then return old; end if;
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'vehicle', old.id,
     coalesce(nullif(concat_ws(' ', old.make, old.model), ''), old.plate, 'Veicolo'));
  return old;
end;
$$;

create or replace function public.audit_invoice_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  if a.role = 'owner' then return old; end if;
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'invoice', old.id,
     old.kind::text || ' ' || old.number);
  return old;
end;
$$;

create or replace function public.audit_document_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.audit_actor_info();
  if a.role = 'owner' then return old; end if;
  insert into public.workshop_audit_log
    (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label)
  values
    (coalesce(old.workshop_id, a.workshop_id), a.actor_id, a.full_name, a.role,
     'delete', 'document', old.id, old.file_name);
  return old;
end;
$$;

create or replace function public.audit_case_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a record;
  v_cust text;
begin
  if old.status is distinct from new.status then
    select * into a from public.audit_actor_info();
    if a.role = 'owner' then return new; end if;
    select c.full_name into v_cust from public.customers c where c.id = new.customer_id;
    insert into public.workshop_audit_log
      (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label, changes)
    values
      (new.workshop_id, a.actor_id, a.full_name, a.role,
       'status_change', 'case', new.id,
       coalesce(v_cust, 'Pratica'),
       jsonb_build_object('status', jsonb_build_array(old.status, new.status)));
  end if;
  return new;
end;
$$;

create or replace function public.audit_invoice_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if old.status is distinct from new.status then
    select * into a from public.audit_actor_info();
    if a.role = 'owner' then return new; end if;
    insert into public.workshop_audit_log
      (workshop_id, actor_id, actor_full_name, actor_role, action, entity_type, entity_id, entity_label, changes)
    values
      (new.workshop_id, a.actor_id, a.full_name, a.role,
       'status_change', 'invoice', new.id,
       new.kind::text || ' ' || new.number,
       jsonb_build_object('status', jsonb_build_array(old.status, new.status)));
  end if;
  return new;
end;
$$;
