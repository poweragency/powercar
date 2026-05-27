-- ============================================================
-- Nuovo stadio pipeline: "controllo titolare" tra Finitura e Completata.
--
-- Il finitore, completando la finitura, NON porta più la pratica direttamente
-- a 'completata' ma a 'controllo_titolare'. Il titolare la valida manualmente
-- (checkbox) e solo allora passa a 'completata'.
--
-- ADD VALUE va in una migration separata da chi usa il literal (next_phase,
-- notify_finitura_done): il nuovo valore enum è utilizzabile solo dopo il commit.
-- ============================================================

alter type public.case_status add value if not exists 'controllo_titolare' before 'completata';
