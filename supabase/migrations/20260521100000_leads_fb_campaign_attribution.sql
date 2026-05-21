-- ============================================================
-- Lead attribution: campagna / adset / ad / form da Facebook Lead Ads.
--
-- Oggi salviamo solo `fb_form_id` ma non i nomi leggibili della
-- gerarchia Meta. Aggiungiamo qui le colonne necessarie a mostrare
-- "da quale offerta arriva" il lead direttamente sulla card del
-- Kanban (vedi LeadCard.tsx) senza dover fare lookup runtime sulla
-- Graph API.
--
-- Tutte le colonne sono NULLABLE: i lead creati manualmente o quelli
-- arrivati prima di questa migration non avranno questi campi
-- popolati, e la UI deve gestirlo (mostra pill solo se presente).
--
-- Indice su `campaign_name` per filtri/raggruppamenti futuri sul
-- Kanban senza scan completi.
-- ============================================================

alter table public.leads
  add column if not exists campaign_id   text,
  add column if not exists campaign_name text,
  add column if not exists adset_id      text,
  add column if not exists adset_name    text,
  add column if not exists ad_id         text,
  add column if not exists ad_name       text,
  add column if not exists form_name     text;

create index if not exists leads_campaign_name_idx
  on public.leads(campaign_name)
  where campaign_name is not null;
