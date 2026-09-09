
-- 1) Voltar as 3 views para SECURITY DEFINER (filtragem por coluna já existe na própria view)
ALTER VIEW public.mentoring_sessions_public SET (security_invoker = off);
ALTER VIEW public.mentors_public            SET (security_invoker = off);
ALTER VIEW public.vendedores_public         SET (security_invoker = off);

-- 2) Remover policies SELECT amplas adicionadas anteriormente (expunham colunas sensíveis)
DROP POLICY IF EXISTS "Authenticated can read active mentoring sessions" ON public.mentoring_sessions;
DROP POLICY IF EXISTS "Authenticated can read mentors" ON public.mentors;
DROP POLICY IF EXISTS "Authenticated can read active vendedores" ON public.vendedores;

-- 3) Garantir GRANT SELECT nas views para authenticated (necessário porque agora rodam como definer)
GRANT SELECT ON public.mentoring_sessions_public TO authenticated;
GRANT SELECT ON public.mentors_public            TO authenticated;
GRANT SELECT ON public.vendedores_public         TO authenticated;

-- 4) Restringir content_tracks e platform_updates a usuários autenticados (não-anon)
DROP POLICY IF EXISTS "Authenticated users can view active content tracks" ON public.content_tracks;
CREATE POLICY "Authenticated users can view active content tracks"
ON public.content_tracks
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can view active updates" ON public.platform_updates;
CREATE POLICY "Authenticated users can view active updates"
ON public.platform_updates
FOR SELECT
TO authenticated
USING (is_active = true);
