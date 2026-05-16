ALTER TABLE public.fotos_inspecao
  ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_fotos_inspecao_inspecao_ordem
  ON public.fotos_inspecao (inspecao_id, tipo_foto, ordem, created_at);

-- Inicializa a ordem para fotos existentes, por tipo, usando a ordem de
-- criação atual (assim a UI mantém o mesmo arranjo que o usuário já via).
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY inspecao_id, tipo_foto
           ORDER BY created_at ASC, id ASC
         ) - 1 AS rn
  FROM public.fotos_inspecao
)
UPDATE public.fotos_inspecao f
SET ordem = r.rn
FROM ranked r
WHERE f.id = r.id AND f.ordem = 0;