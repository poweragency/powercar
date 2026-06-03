-- ============================================================
-- Fix di sicurezza da audit (2026-06-03)
--
-- #1 CRITICO — Privilege escalation via profiles.
--   La policy profiles_update_own permette all'utente di aggiornare la
--   propria riga senza restrizioni di colonna: un dipendente poteva fare
--   update({role:'owner'}) o update({workshop_id}) dalla console del browser.
--   Aggiungiamo un BEFORE UPDATE trigger che blocca le modifiche a
--   role / workshop_id quando la richiesta arriva da un utente loggato.
--   Il service_role (route admin/team, trigger interni) ha auth.uid() = NULL
--   e resta libero di cambiare la mansione.
--
-- #2 ALTO — Token Facebook leggibile dai dipendenti.
--   fb_page_access_token / fb_verify_token erano leggibili da QUALSIASI
--   membro del workshop (RLS non filtra per colonna) sia su workshops
--   (workshops_select_own) sia sulla copia legacy in profiles
--   (profiles_select_workshop_or_admin).
--   - Eliminiamo le copie legacy da profiles (workshops è source-of-truth;
--     il webhook legge solo da workshops). Verificato: nessun token presente
--     solo su profiles.
--   - Revochiamo la SELECT a livello-colonna sui token di workshops a
--     authenticated/anon. Il service_role (webhook) non è impattato.
--   - L'owner legge il verify_token (gli serve per configurare il webhook su
--     Meta) tramite una RPC owner-only; il page access token diventa
--     write-only nel form Impostazioni.
-- ============================================================

-- ------------------------------------------------------------
-- #1 — Guard su profiles.role / profiles.workshop_id
-- ------------------------------------------------------------
create or replace function public.guard_profile_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role / migrazioni / trigger interni: auth.uid() è NULL → nessun
  -- vincolo (le route /api/admin/* e /api/team/* cambiano la mansione con la
  -- service key, non con la sessione utente).
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'forbidden: il ruolo non e'' auto-modificabile';
  end if;
  if new.workshop_id is distinct from old.workshop_id then
    raise exception 'forbidden: il workshop non e'' auto-modificabile';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_profile_privileged_cols() from anon, authenticated;

drop trigger if exists trg_guard_profile_cols on public.profiles;
create trigger trg_guard_profile_cols
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_cols();

-- ------------------------------------------------------------
-- #2 — Token Facebook: rimuovi copie legacy da profiles
-- ------------------------------------------------------------
-- (Pre-verificato: 0 token presenti solo su profiles → nessuna perdita dati.)
alter table public.profiles drop column if exists fb_page_access_token;
alter table public.profiles drop column if exists fb_verify_token;

-- ------------------------------------------------------------
-- #2 — Token Facebook: nascondi i token di workshops ai dipendenti
-- ------------------------------------------------------------
-- RLS non filtra per colonna. ATTENZIONE: una REVOKE a livello-colonna è
-- INEFFICACE finché esiste un GRANT SELECT a livello-tabella (Postgres
-- considera prevalente la SELECT di tabella). Quindi revochiamo la SELECT di
-- tabella e concediamo la SELECT solo sulle colonne NON sensibili (esclusi i
-- token). Il service_role (webhook) ha privilegi propri e continua a leggere;
-- le funzioni SECURITY DEFINER (RPC sotto) girano come definer e non sono
-- impattate.
revoke select on public.workshops from authenticated, anon;

grant select (
  id, name, phone, vat_number, tax_code, address, city, postal_code,
  province, country, iban, logo_url, fb_page_id, created_at, updated_at
) on public.workshops to authenticated;

-- ------------------------------------------------------------
-- #2 — RPC owner-only per leggere il verify_token + sapere se il token è impostato
-- ------------------------------------------------------------
create or replace function public.get_workshop_fb_secrets()
returns table (fb_verify_token text, has_access_token boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
begin
  if not public.is_owner() then
    raise exception 'forbidden';
  end if;
  v_ws := public.current_workshop_id();
  return query
    select
      w.fb_verify_token,
      (w.fb_page_access_token is not null and w.fb_page_access_token <> '') as has_access_token
    from public.workshops w
    where w.id = v_ws;
end;
$$;

revoke execute on function public.get_workshop_fb_secrets() from anon;
grant execute on function public.get_workshop_fb_secrets() to authenticated;
