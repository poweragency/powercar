-- ============================================================
-- FK customers.lead_id: ON DELETE SET NULL → ON DELETE CASCADE
-- Eliminare un lead ora elimina anche il customer creato dal
-- trigger handle_lead_to_customer, e a cascata la sua pratica.
-- I customers con lead_id già NULL non sono toccati.
-- ============================================================

alter table public.customers
  drop constraint if exists customers_lead_id_fkey;

alter table public.customers
  add constraint customers_lead_id_fkey
  foreign key (lead_id)
  references public.leads(id)
  on delete cascade;
