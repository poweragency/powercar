-- ============================================================
-- Indici composti (workshop_id, <data>) per le query principali.
--
-- Le query liste/dashboard fanno tutte filter su workshop_id + sort
-- per created_at (o starts_at per appointments). Con indici singoli
-- su workshop_id il planner scansiona poi sorta — con officine grandi
-- diventa lento. Indici composti coprono entrambi.
--
-- IMPORTANT: `concurrently` non funziona dentro transazioni, ma le
-- migration Supabase girano in una transazione. Quindi usiamo indici
-- normali. Su tabelle piccole è istantaneo; su tabelle grandi puo'
-- locking write per pochi secondi.
-- ============================================================

create index if not exists leads_workshop_created_idx
  on public.leads(workshop_id, created_at desc);

create index if not exists customers_workshop_created_idx
  on public.customers(workshop_id, created_at desc);

create index if not exists cases_workshop_created_idx
  on public.cases(workshop_id, created_at desc);

create index if not exists invoices_workshop_created_idx
  on public.invoices(workshop_id, created_at desc);

create index if not exists appointments_workshop_starts_idx
  on public.appointments(workshop_id, starts_at);
