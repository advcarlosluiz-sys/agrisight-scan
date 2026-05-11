ALTER TABLE public.analises_ia
  ADD COLUMN IF NOT EXISTS prompt_versao text,
  ADD COLUMN IF NOT EXISTS prompt_system text,
  ADD COLUMN IF NOT EXISTS prompt_user text;