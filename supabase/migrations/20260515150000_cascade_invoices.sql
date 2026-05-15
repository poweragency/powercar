-- ============================================================
-- FK invoices.customer_id: ON DELETE RESTRICT → ON DELETE CASCADE
-- Permette di eliminare un cliente (e a cascata tutto: cases,
-- vehicles, invoices, invoice_items, documents, notes).
-- Senza questo, eliminare un lead falliva quando il customer
-- collegato aveva preventivi/fatture.
-- ============================================================

alter table public.invoices
  drop constraint if exists invoices_customer_id_fkey;

alter table public.invoices
  add constraint invoices_customer_id_fkey
  foreign key (customer_id)
  references public.customers(id)
  on delete cascade;
