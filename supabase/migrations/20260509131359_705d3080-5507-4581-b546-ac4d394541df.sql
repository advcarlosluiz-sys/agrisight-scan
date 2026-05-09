
-- Restringir execução das funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_demo_data() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_demo_data() TO authenticated;

-- Substituir policy "criar_org_no_signup" por uma versão restrita ao próprio usuário autenticado
DROP POLICY IF EXISTS "criar_org_no_signup" ON public.organizacoes;
CREATE POLICY "criar_org_autenticado" ON public.organizacoes
  FOR INSERT TO authenticated WITH CHECK (true);
