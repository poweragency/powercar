-- Tieni solo la notifica "Lavorazione conclusa" (case_status_change,
-- trigger su cases). Mattia non vuole le notifiche di nuovo lead né
-- altre: l'unico segnale rilevante è quando il dipendente conclude la
-- finitura su una pratica.
--
-- Rimuove:
--  - trigger trg_notify_new_lead sul nuovo lead
--  - funzione notify_new_lead
--  - tutte le righe in notifications con type diverso da
--    'case_status_change' (cleanup di quanto già accumulato).
-- Lascia in piedi l'enum notification_type per non rompere ABI:
--  Postgres non rimuove facilmente i valori e gli altri tipi sono
--  comunque inerti (nessun trigger li produce più).

drop trigger if exists trg_notify_new_lead on public.leads;
drop function if exists public.notify_new_lead();

delete from public.notifications
where type <> 'case_status_change';
