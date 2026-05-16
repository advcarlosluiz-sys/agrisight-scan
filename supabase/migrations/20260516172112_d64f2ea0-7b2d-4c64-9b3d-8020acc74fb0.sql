CREATE TABLE public.tentativas_analise_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID NOT NULL,
  inspecao_id UUID NOT NULL,
  tentativa INTEGER NOT NULL,
  sucesso BOOLEAN NOT NULL DEFAULT false,
  degradado BOOLEAN NOT NULL DEFAULT false,
  degradado_codigo TEXT,
  degradado_detalhe TEXT,
  http_status INTEGER,
  duracao_ms INTEGER,
  modelo_ia TEXT,
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_tentativas_analise_ia_inspecao ON public.tentativas_analise_ia(inspecao_id, created_at DESC);

ALTER TABLE public.tentativas_analise_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver_tentativas_analise_ia"
ON public.tentativas_analise_ia FOR SELECT
USING (organizacao_id = current_org_id());

CREATE POLICY "inserir_tentativas_analise_ia"
ON public.tentativas_analise_ia FOR INSERT
WITH CHECK (organizacao_id = current_org_id());

CREATE POLICY "atualizar_tentativas_analise_ia"
ON public.tentativas_analise_ia FOR UPDATE
USING (organizacao_id = current_org_id());

CREATE POLICY "deletar_tentativas_analise_ia"
ON public.tentativas_analise_ia FOR DELETE
USING (organizacao_id = current_org_id());