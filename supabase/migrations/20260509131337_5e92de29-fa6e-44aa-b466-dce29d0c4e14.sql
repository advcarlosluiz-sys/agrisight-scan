
-- ============ ENUMS ============
CREATE TYPE public.status_geral AS ENUM ('normal', 'atencao', 'critico');
CREATE TYPE public.risco_nivel AS ENUM ('baixo', 'medio', 'alto');
CREATE TYPE public.papel_perfil AS ENUM ('admin', 'agronomo', 'vistoriador');
CREATE TYPE public.prioridade_tarefa AS ENUM ('baixa', 'media', 'alta', 'urgente');
CREATE TYPE public.status_tarefa AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada');
CREATE TYPE public.tipo_foto AS ENUM ('geral', 'plantas', 'folhas', 'frutos', 'solo', 'plastico');

-- ============ TABLES ============
CREATE TABLE public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  papel public.papel_perfil NOT NULL DEFAULT 'vistoriador',
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.perfis(organizacao_id);

CREATE TABLE public.produtores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT,
  telefone TEXT,
  email TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.produtores(organizacao_id);

CREATE TABLE public.propriedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  produtor_id UUID NOT NULL REFERENCES public.produtores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.propriedades(organizacao_id);
CREATE INDEX ON public.propriedades(produtor_id);

CREATE TABLE public.canteiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  propriedade_id UUID NOT NULL REFERENCES public.propriedades(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cultura TEXT NOT NULL DEFAULT 'morango',
  variedade TEXT,
  area_m2 NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.canteiros(organizacao_id);
CREATE INDEX ON public.canteiros(propriedade_id);

CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  canteiro_id UUID NOT NULL REFERENCES public.canteiros(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  qr_code TEXT,
  linha INT,
  coluna INT,
  status_atual public.status_geral,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(canteiro_id, codigo)
);
CREATE INDEX ON public.setores(organizacao_id);
CREATE INDEX ON public.setores(canteiro_id);

CREATE TABLE public.inspecoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  propriedade_id UUID REFERENCES public.propriedades(id) ON DELETE SET NULL,
  canteiro_id UUID REFERENCES public.canteiros(id) ON DELETE SET NULL,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  vistoriador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data_inspecao DATE NOT NULL DEFAULT CURRENT_DATE,
  temperatura NUMERIC,
  umidade NUMERIC,
  luminosidade NUMERIC,
  mato_alto BOOLEAN DEFAULT false,
  plastico_rasgado BOOLEAN DEFAULT false,
  poucos_frutos BOOLEAN DEFAULT false,
  plantas_fracas BOOLEAN DEFAULT false,
  frutos_maduros BOOLEAN DEFAULT false,
  pragas_visiveis BOOLEAN DEFAULT false,
  folhas_manchadas BOOLEAN DEFAULT false,
  solo_seco BOOLEAN DEFAULT false,
  solo_encharcado BOOLEAN DEFAULT false,
  observacao_manual TEXT,
  status_geral public.status_geral,
  risco public.risco_nivel,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.inspecoes(organizacao_id);
CREATE INDEX ON public.inspecoes(canteiro_id);
CREATE INDEX ON public.inspecoes(setor_id);
CREATE INDEX ON public.inspecoes(data_inspecao DESC);

CREATE TABLE public.fotos_inspecao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  inspecao_id UUID NOT NULL REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  tipo_foto public.tipo_foto NOT NULL,
  storage_path TEXT NOT NULL,
  legenda TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.fotos_inspecao(inspecao_id);

CREATE TABLE public.analises_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  inspecao_id UUID NOT NULL REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  modelo_ia TEXT,
  status_geral public.status_geral,
  risco public.risco_nivel,
  confianca NUMERIC,
  problemas_detectados JSONB DEFAULT '[]'::jsonb,
  hipoteses_agronomicas JSONB DEFAULT '[]'::jsonb,
  acoes_recomendadas JSONB DEFAULT '[]'::jsonb,
  justificativa TEXT,
  necessidade_agronomo BOOLEAN,
  prioridade TEXT,
  resposta_completa JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.analises_ia(inspecao_id);

CREATE TABLE public.tarefas_recomendadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  inspecao_id UUID REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade public.prioridade_tarefa NOT NULL DEFAULT 'media',
  status public.status_tarefa NOT NULL DEFAULT 'pendente',
  prazo DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tarefas_recomendadas(organizacao_id);

CREATE TABLE public.relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  propriedade_id UUID REFERENCES public.propriedades(id) ON DELETE SET NULL,
  canteiro_id UUID REFERENCES public.canteiros(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  periodo_inicio DATE,
  periodo_fim DATE,
  resumo JSONB,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ HELPER FUNCTION (avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organizacao_id FROM public.perfis WHERE id = auth.uid()
$$;

-- ============ ENABLE RLS ============
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propriedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_inspecao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analises_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_recomendadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- Organizacoes: usuario ve sua organizacao
CREATE POLICY "ver_propria_org" ON public.organizacoes FOR SELECT USING (id = public.current_org_id());
CREATE POLICY "criar_org_no_signup" ON public.organizacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "atualizar_propria_org" ON public.organizacoes FOR UPDATE USING (id = public.current_org_id());

-- Perfis
CREATE POLICY "ver_perfis_da_org" ON public.perfis FOR SELECT USING (organizacao_id = public.current_org_id() OR id = auth.uid());
CREATE POLICY "criar_proprio_perfil" ON public.perfis FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "atualizar_proprio_perfil" ON public.perfis FOR UPDATE USING (id = auth.uid());

-- Helper macro for tables with organizacao_id
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'produtores','propriedades','canteiros','setores','inspecoes',
    'fotos_inspecao','analises_ia','tarefas_recomendadas','relatorios'
  ]) LOOP
    EXECUTE format('CREATE POLICY "ver_%I" ON public.%I FOR SELECT USING (organizacao_id = public.current_org_id())', t, t);
    EXECUTE format('CREATE POLICY "inserir_%I" ON public.%I FOR INSERT WITH CHECK (organizacao_id = public.current_org_id())', t, t);
    EXECUTE format('CREATE POLICY "atualizar_%I" ON public.%I FOR UPDATE USING (organizacao_id = public.current_org_id())', t, t);
    EXECUTE format('CREATE POLICY "deletar_%I" ON public.%I FOR DELETE USING (organizacao_id = public.current_org_id())', t, t);
  END LOOP;
END $$;

-- ============ TRIGGER: criar org + perfil no signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_org_id UUID;
  nome_user TEXT;
BEGIN
  nome_user := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
  INSERT INTO public.organizacoes (nome, email)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'organizacao', nome_user || ' Agro'), NEW.email)
  RETURNING id INTO novo_org_id;

  INSERT INTO public.perfis (id, organizacao_id, nome, papel)
  VALUES (NEW.id, novo_org_id, nome_user, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos','inspection-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('reports','reports', false);

-- Storage policies: path begins with org_id
CREATE POLICY "ver_fotos_da_org" ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = public.current_org_id()::text);
CREATE POLICY "upload_fotos_da_org" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = public.current_org_id()::text);
CREATE POLICY "deletar_fotos_da_org" ON storage.objects FOR DELETE
  USING (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = public.current_org_id()::text);

CREATE POLICY "ver_reports_da_org" ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = public.current_org_id()::text);
CREATE POLICY "upload_reports_da_org" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reports' AND (storage.foldername(name))[1] = public.current_org_id()::text);

-- ============ RPC: claim_demo_data — copia dados demo para a org do usuário atual ============
CREATE OR REPLACE FUNCTION public.claim_demo_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org UUID;
  prod1 UUID; prod2 UUID;
  prop1 UUID; prop2 UUID;
  cant1 UUID; cant2 UUID; cant3 UUID;
  setor_rec RECORD;
  s_id UUID;
  insp_id UUID;
  i INT;
  status_arr public.status_geral[] := ARRAY['normal','normal','atencao','critico','normal']::public.status_geral[];
  risco_arr public.risco_nivel[] := ARRAY['baixo','baixo','medio','alto','baixo']::public.risco_nivel[];
BEGIN
  SELECT organizacao_id INTO org FROM public.perfis WHERE id = auth.uid();
  IF org IS NULL THEN RAISE EXCEPTION 'Sem organizacao'; END IF;

  -- Evita duplicar
  IF EXISTS (SELECT 1 FROM public.produtores WHERE organizacao_id = org) THEN RETURN; END IF;

  INSERT INTO public.produtores (organizacao_id, nome, telefone, email)
    VALUES (org, 'João Silva', '(35) 99999-1111', 'joao@fazenda.com') RETURNING id INTO prod1;
  INSERT INTO public.produtores (organizacao_id, nome, telefone, email)
    VALUES (org, 'Maria Souza', '(35) 99999-2222', 'maria@fazenda.com') RETURNING id INTO prod2;

  INSERT INTO public.propriedades (organizacao_id, produtor_id, nome, cidade, estado)
    VALUES (org, prod1, 'Sítio Bela Vista', 'Pouso Alegre', 'MG') RETURNING id INTO prop1;
  INSERT INTO public.propriedades (organizacao_id, produtor_id, nome, cidade, estado)
    VALUES (org, prod2, 'Fazenda Aurora', 'Cambuí', 'MG') RETURNING id INTO prop2;

  INSERT INTO public.canteiros (organizacao_id, propriedade_id, nome, variedade, area_m2)
    VALUES (org, prop1, 'Canteiro Norte', 'Albion', 480) RETURNING id INTO cant1;
  INSERT INTO public.canteiros (organizacao_id, propriedade_id, nome, variedade, area_m2)
    VALUES (org, prop1, 'Canteiro Sul', 'San Andreas', 520) RETURNING id INTO cant2;
  INSERT INTO public.canteiros (organizacao_id, propriedade_id, nome, variedade, area_m2)
    VALUES (org, prop2, 'Canteiro Principal', 'Camarosa', 640) RETURNING id INTO cant3;

  -- Setores A1..A10 no canteiro principal
  FOR i IN 1..10 LOOP
    INSERT INTO public.setores (organizacao_id, canteiro_id, codigo, qr_code, linha, coluna)
    VALUES (org, cant3, 'A' || lpad(i::text,2,'0'), 'A' || lpad(i::text,2,'0'), 1, i);
  END LOOP;
  -- também nos demais
  FOR i IN 1..5 LOOP
    INSERT INTO public.setores (organizacao_id, canteiro_id, codigo, qr_code, linha, coluna)
    VALUES (org, cant1, 'A' || lpad(i::text,2,'0'), 'A' || lpad(i::text,2,'0'), 1, i);
    INSERT INTO public.setores (organizacao_id, canteiro_id, codigo, qr_code, linha, coluna)
    VALUES (org, cant2, 'B' || lpad(i::text,2,'0'), 'B' || lpad(i::text,2,'0'), 1, i);
  END LOOP;

  -- 5 inspeções no canteiro principal
  i := 0;
  FOR setor_rec IN SELECT id FROM public.setores WHERE canteiro_id = cant3 ORDER BY codigo LIMIT 5 LOOP
    i := i + 1;
    INSERT INTO public.inspecoes (
      organizacao_id, propriedade_id, canteiro_id, setor_id, vistoriador_id,
      data_inspecao, temperatura, umidade, luminosidade,
      frutos_maduros, plantas_fracas, mato_alto,
      observacao_manual, status_geral, risco
    ) VALUES (
      org, prop2, cant3, setor_rec.id, auth.uid(),
      CURRENT_DATE - (i || ' days')::interval,
      22 + i, 60 + i, 30000 + i*1000,
      i % 2 = 0, i = 4, i = 3,
      'Inspeção de demonstração ' || i, status_arr[i], risco_arr[i]
    ) RETURNING id INTO insp_id;

    UPDATE public.setores SET status_atual = status_arr[i] WHERE id = setor_rec.id;

    INSERT INTO public.analises_ia (
      organizacao_id, inspecao_id, modelo_ia, status_geral, risco, confianca,
      problemas_detectados, hipoteses_agronomicas, acoes_recomendadas,
      justificativa, necessidade_agronomo, prioridade
    ) VALUES (
      org, insp_id, 'demo', status_arr[i], risco_arr[i], 0.85,
      CASE WHEN i=4 THEN '["Plantas com aspecto fraco","Possível deficiência nutricional"]'::jsonb
           WHEN i=3 THEN '["Mato alto entre plantas"]'::jsonb
           ELSE '[]'::jsonb END,
      '["Avaliar manejo nutricional"]'::jsonb,
      CASE WHEN i=4 THEN '["Aplicar adubação foliar","Acionar agrônomo"]'::jsonb
           WHEN i=3 THEN '["Capina manual","Cobertura morta"]'::jsonb
           ELSE '["Manter monitoramento"]'::jsonb END,
      'Análise gerada na demonstração inicial.',
      i = 4, CASE WHEN i=4 THEN 'alta' WHEN i=3 THEN 'media' ELSE 'baixa' END
    );
  END LOOP;
END;
$$;
