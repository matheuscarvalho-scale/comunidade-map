-- ============================================================
-- FIX 1: Remover member_messages do Realtime
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'member_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.member_messages';
  END IF;
END $$;

-- ============================================================
-- FIX 2: Bloquear escrita no bucket "resources" para não-admins
-- ============================================================
-- Remover policies permissivas existentes do bucket resources
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        policyname ILIKE '%resources%' 
        OR policyname ILIKE '%resource%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- SELECT: qualquer usuário autenticado pode ler
CREATE POLICY "Resources bucket: authenticated can read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resources');

-- INSERT: somente admins
CREATE POLICY "Resources bucket: admins can insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resources' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::app_role)
    OR public.has_role(auth.uid(), 'admin_conteudo'::app_role)
  )
);

-- UPDATE: somente admins
CREATE POLICY "Resources bucket: admins can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resources' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::app_role)
    OR public.has_role(auth.uid(), 'admin_conteudo'::app_role)
  )
);

-- DELETE: somente admins
CREATE POLICY "Resources bucket: admins can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resources' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::app_role)
    OR public.has_role(auth.uid(), 'admin_conteudo'::app_role)
  )
);

-- ============================================================
-- FIX 3: Remover exposição de phone/subscription em perfis públicos
-- ============================================================
-- Remover policies que exponham phone/subscription via is_public = true
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    -- Remover apenas policies que permitem leitura ampla via is_public
    IF pol.policyname ILIKE '%public%' OR pol.policyname ILIKE '%is_public%' OR pol.policyname ILIKE '%everyone%' OR pol.policyname ILIKE '%anyone%' THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END IF;
  END LOOP;
END $$;

-- Garantir policies seguras: usuário vê o próprio perfil; admins veem todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
      AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
      AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'admin_geral'::app_role)
      OR public.has_role(auth.uid(), 'admin_financeiro'::app_role)
      OR public.has_role(auth.uid(), 'admin_conteudo'::app_role)
      OR public.has_role(auth.uid(), 'cx'::app_role)
    );
  END IF;
END $$;

-- Recriar view pública segura SEM phone, subscription, pending_plan
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  user_id,
  name,
  bio,
  avatar_url,
  company,
  job_title,
  industry,
  niche,
  experience_level,
  location,
  location_city,
  location_state,
  specialties,
  linkedin_url,
  instagram_url,
  website_url,
  social_links,
  is_public,
  total_points,
  streak,
  created_at
FROM public.profiles
WHERE is_public = true;

GRANT SELECT ON public.profiles_public TO authenticated, anon;