-- Enum para status do processo da inspeção
DO $$ BEGIN
  CREATE TYPE public.status_processo_inspecao AS ENUM ('em_andamento','analisando','concluida','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.inspecoes
  ADD COLUMN IF NOT EXISTS status_processo public.status_processo_inspecao NOT NULL DEFAULT 'em_andamento';

CREATE INDEX IF NOT EXISTS idx_inspecoes_status_processo ON public.inspecoes(status_processo);