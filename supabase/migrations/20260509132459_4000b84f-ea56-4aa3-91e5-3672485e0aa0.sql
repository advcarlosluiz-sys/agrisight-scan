
-- Foreign keys de integridade referencial entre as tabelas do domínio

-- perfis -> organizacoes / auth.users
ALTER TABLE public.perfis
  ADD CONSTRAINT perfis_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT perfis_user_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- produtores -> organizacoes
ALTER TABLE public.produtores
  ADD CONSTRAINT produtores_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE;

-- propriedades -> organizacoes / produtores
ALTER TABLE public.propriedades
  ADD CONSTRAINT propriedades_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT propriedades_produtor_fk FOREIGN KEY (produtor_id) REFERENCES public.produtores(id) ON DELETE CASCADE;

-- canteiros -> organizacoes / propriedades
ALTER TABLE public.canteiros
  ADD CONSTRAINT canteiros_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT canteiros_propriedade_fk FOREIGN KEY (propriedade_id) REFERENCES public.propriedades(id) ON DELETE CASCADE;

-- setores -> organizacoes / canteiros
ALTER TABLE public.setores
  ADD CONSTRAINT setores_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT setores_canteiro_fk FOREIGN KEY (canteiro_id) REFERENCES public.canteiros(id) ON DELETE CASCADE;

-- inspecoes -> organizacoes / propriedades / canteiros / setores / vistoriador
ALTER TABLE public.inspecoes
  ADD CONSTRAINT inspecoes_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT inspecoes_propriedade_fk FOREIGN KEY (propriedade_id) REFERENCES public.propriedades(id) ON DELETE SET NULL,
  ADD CONSTRAINT inspecoes_canteiro_fk FOREIGN KEY (canteiro_id) REFERENCES public.canteiros(id) ON DELETE SET NULL,
  ADD CONSTRAINT inspecoes_setor_fk FOREIGN KEY (setor_id) REFERENCES public.setores(id) ON DELETE SET NULL,
  ADD CONSTRAINT inspecoes_vistoriador_fk FOREIGN KEY (vistoriador_id) REFERENCES public.perfis(id) ON DELETE SET NULL;

-- fotos_inspecao -> organizacoes / inspecoes
ALTER TABLE public.fotos_inspecao
  ADD CONSTRAINT fotos_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT fotos_inspecao_fk FOREIGN KEY (inspecao_id) REFERENCES public.inspecoes(id) ON DELETE CASCADE;

-- analises_ia -> organizacoes / inspecoes
ALTER TABLE public.analises_ia
  ADD CONSTRAINT analises_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT analises_inspecao_fk FOREIGN KEY (inspecao_id) REFERENCES public.inspecoes(id) ON DELETE CASCADE;

-- tarefas_recomendadas -> organizacoes / inspecoes / setores
ALTER TABLE public.tarefas_recomendadas
  ADD CONSTRAINT tarefas_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT tarefas_inspecao_fk FOREIGN KEY (inspecao_id) REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT tarefas_setor_fk FOREIGN KEY (setor_id) REFERENCES public.setores(id) ON DELETE SET NULL;

-- relatorios -> organizacoes / propriedades / canteiros
ALTER TABLE public.relatorios
  ADD CONSTRAINT relatorios_organizacao_fk FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT relatorios_propriedade_fk FOREIGN KEY (propriedade_id) REFERENCES public.propriedades(id) ON DELETE CASCADE,
  ADD CONSTRAINT relatorios_canteiro_fk FOREIGN KEY (canteiro_id) REFERENCES public.canteiros(id) ON DELETE CASCADE;

-- Trigger faltante: handle_new_user em auth.users (criar org + perfil no signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Índices para performance nas FKs mais consultadas
CREATE INDEX IF NOT EXISTS idx_inspecoes_org ON public.inspecoes(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_canteiro ON public.inspecoes(canteiro_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_setor ON public.inspecoes(setor_id);
CREATE INDEX IF NOT EXISTS idx_setores_canteiro ON public.setores(canteiro_id);
CREATE INDEX IF NOT EXISTS idx_canteiros_prop ON public.canteiros(propriedade_id);
CREATE INDEX IF NOT EXISTS idx_propriedades_produtor ON public.propriedades(produtor_id);
CREATE INDEX IF NOT EXISTS idx_fotos_inspecao ON public.fotos_inspecao(inspecao_id);
CREATE INDEX IF NOT EXISTS idx_analises_inspecao ON public.analises_ia(inspecao_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_inspecao ON public.tarefas_recomendadas(inspecao_id);
