-- Aggiunge la fase di lavorazione alla foto/documento.
-- Permette di raggruppare le foto del caso per: preparazione, verniciatura, finitura.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS phase text
    CHECK (phase IN ('preparazione','verniciatura','finitura'));

CREATE INDEX IF NOT EXISTS documents_case_phase_idx
  ON public.documents (case_id, phase);
