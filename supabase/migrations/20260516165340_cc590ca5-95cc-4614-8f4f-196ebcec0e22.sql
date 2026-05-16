ALTER TABLE public.perfis
ADD COLUMN IF NOT EXISTS filtro_status_preferido TEXT NOT NULL DEFAULT 'todos';