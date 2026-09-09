
-- 1) Converter as 3 views para security_invoker (passam a respeitar RLS do chamador)
ALTER VIEW public.mentoring_sessions_public SET (security_invoker = on);
ALTER VIEW public.mentors_public            SET (security_invoker = on);
ALTER VIEW public.vendedores_public         SET (security_invoker = on);

-- 2) Adicionar policies SELECT nas tabelas-base para usuários autenticados,
--    para que as views continuem retornando dados. As views já omitem colunas
--    sensíveis (mentor_email, cohost_email, email de mentor/vendedor).

-- mentoring_sessions: membros autenticados podem ler sessões ativas
CREATE POLICY "Authenticated can read active mentoring sessions"
ON public.mentoring_sessions
FOR SELECT
TO authenticated
USING (is_active = true);

-- mentors: membros autenticados podem ler (view esconde email)
CREATE POLICY "Authenticated can read mentors"
ON public.mentors
FOR SELECT
TO authenticated
USING (true);

-- vendedores: membros autenticados podem ler vendedores ativos (view esconde email)
CREATE POLICY "Authenticated can read active vendedores"
ON public.vendedores
FOR SELECT
TO authenticated
USING (status = 'ativo');
