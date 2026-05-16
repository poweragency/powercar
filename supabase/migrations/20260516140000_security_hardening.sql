-- ============================================================
-- Security hardening (Supabase advisors)
-- ============================================================

-- 1) set_updated_at: search_path immutable
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Branding bucket: rimuovi policy LIST broad, mantieni solo owner-LIST.
--    L'accesso pubblico ai file resta via URL pubblico (non serve policy SELECT
--    su storage.objects — l'asset è servito direttamente dal bucket pubblico).
drop policy if exists "branding_public_read" on storage.objects;

-- 3) Revoca EXECUTE dai trigger handler (devono girare solo come trigger,
--    mai chiamati via REST/RPC)
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.set_owner_id() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_lead_to_customer() from anon, authenticated;
revoke execute on function public.recalc_invoice_totals() from anon, authenticated;
revoke execute on function public.notify_new_lead() from anon, authenticated;

-- 4) admin_get_workshops: anon non deve poterla chiamare
revoke execute on function public.admin_get_workshops() from anon;
