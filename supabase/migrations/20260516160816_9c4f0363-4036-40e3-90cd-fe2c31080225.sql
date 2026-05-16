
-- Cadastro do agrônomo padrão da organização
ALTER TABLE public.organizacoes
  ADD COLUMN IF NOT EXISTS agronomo_nome text,
  ADD COLUMN IF NOT EXISTS agronomo_email text,
  ADD COLUMN IF NOT EXISTS agronomo_telefone text;

-- Enum de status da solicitação
DO $$ BEGIN
  CREATE TYPE public.status_solicitacao_agronomo AS ENUM ('pendente','visualizada','atendida','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de solicitações
CREATE TABLE IF NOT EXISTS public.solicitacoes_agronomo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL,
  inspecao_id uuid NOT NULL,
  analise_id uuid,
  prioridade public.prioridade_tarefa NOT NULL DEFAULT 'media',
  status public.status_solicitacao_agronomo NOT NULL DEFAULT 'pendente',
  observacao text,
  agronomo_nome text,
  agronomo_email text,
  agronomo_telefone text,
  problemas jsonb NOT NULL DEFAULT '[]'::jsonb,
  acoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  atendida_em timestamptz,
  lida boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_solic_org_status ON public.solicitacoes_agronomo (organizacao_id, status);
CREATE INDEX IF NOT EXISTS idx_solic_org_lida ON public.solicitacoes_agronomo (organizacao_id, lida);
CREATE INDEX IF NOT EXISTS idx_solic_inspecao ON public.solicitacoes_agronomo (inspecao_id);

ALTER TABLE public.solicitacoes_agronomo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver_solic_agronomo" ON public.solicitacoes_agronomo
  FOR SELECT USING (organizacao_id = public.current_org_id());
CREATE POLICY "inserir_solic_agronomo" ON public.solicitacoes_agronomo
  FOR INSERT WITH CHECK (organizacao_id = public.current_org_id());
CREATE POLICY "atualizar_solic_agronomo" ON public.solicitacoes_agronomo
  FOR UPDATE USING (organizacao_id = public.current_org_id());
CREATE POLICY "deletar_solic_agronomo" ON public.solicitacoes_agronomo
  FOR DELETE USING (organizacao_id = public.current_org_id());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_agronomo;
