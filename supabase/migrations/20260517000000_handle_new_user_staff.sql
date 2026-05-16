-- ============================================================
-- Step 4/5 — handle_new_user supporta staff (workshop_id da metadata)
--
-- Quando l'admin/owner crea un user via supabase.auth.admin.createUser,
-- passa nel raw_user_meta_data:
--   - workshop_id: uuid del workshop a cui linkare (caso staff)
--   - role: 'owner' | 'staff'
--   - full_name (opzionale)
--   - workshop_name (opzionale, usato solo se workshop_id mancante)
--
-- Se workshop_id mancante → crea un nuovo workshop (caso primo owner).
-- Se workshop_id presente → linka al workshop esistente (caso staff).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop_id uuid;
  v_role user_role;
  v_meta_ws_id text := new.raw_user_meta_data->>'workshop_id';
  v_meta_role text := new.raw_user_meta_data->>'role';
  v_workshop_name text := coalesce(
    new.raw_user_meta_data->>'workshop_name',
    'La mia carrozzeria'
  );
  v_full_name text := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.email
  );
begin
  -- Ruolo: 'staff' solo se esplicitamente richiesto. Default 'owner'.
  v_role := case
    when v_meta_role = 'staff' then 'staff'::user_role
    else 'owner'::user_role
  end;

  if v_meta_ws_id is not null and v_meta_ws_id <> '' then
    -- Staff aggiunto da owner: linka al workshop passato
    v_workshop_id := v_meta_ws_id::uuid;
  else
    -- Nuovo owner: crea workshop dedicato
    insert into public.workshops (name)
    values (v_workshop_name)
    returning id into v_workshop_id;
  end if;

  insert into public.profiles (id, full_name, workshop_id, role, workshop_name)
  values (
    new.id,
    v_full_name,
    v_workshop_id,
    v_role,
    v_workshop_name
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;
