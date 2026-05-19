-- Aggiunge il sesto stato 'liquidato' al flusso pratica carrozzeria.
-- Postgres non consente di usare un nuovo valore enum nella stessa
-- transazione in cui viene aggiunto: per questo la logica che lo
-- referenzia (trigger notifica, RPC dashboard) sta in una migration
-- separata che gira dopo il commit di questa.

alter type public.case_status add value if not exists 'liquidato' after 'consegnata';
