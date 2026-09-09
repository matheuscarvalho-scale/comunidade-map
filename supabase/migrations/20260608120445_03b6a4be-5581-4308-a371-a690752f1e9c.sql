-- Fix video RLS policy so subscription fields are read only inside a SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.can_access_cloudflare_video(_access_level public.video_access_level)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text;
  _plan text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF _access_level = 'public'::public.video_access_level THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin_geral', 'admin', 'admin_conteudo', 'marketing', 'automacao')
  ) THEN
    RETURN true;
  END IF;

  SELECT p.subscription_status, p.subscription_plan
    INTO _status, _plan
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  IF _status IS DISTINCT FROM 'active' THEN
    RETURN false;
  END IF;

  IF _access_level = 'members'::public.video_access_level THEN
    RETURN _plan IN ('basic', 'starter', 'pro', 'business', 'enterprise');
  END IF;

  IF _access_level = 'pro'::public.video_access_level THEN
    RETURN _plan IN ('pro', 'business', 'enterprise');
  END IF;

  IF _access_level = 'enterprise'::public.video_access_level THEN
    RETURN _plan IN ('business', 'enterprise');
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_cloudflare_video(public.video_access_level) TO authenticated;

DROP POLICY IF EXISTS "Users can view videos matching their access level" ON public.cloudflare_videos;
CREATE POLICY "Users can view videos matching their access level"
ON public.cloudflare_videos
FOR SELECT
TO authenticated
USING (public.can_access_cloudflare_video(access_level));

-- Fix seller data exposure: sellers no longer read the full vendedores row.
CREATE OR REPLACE FUNCTION public.get_my_seller_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id
  FROM public.vendedores v
  WHERE lower(v.email) = lower(auth.jwt() ->> 'email')
    AND v.status = 'ativo'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_seller_profile()
RETURNS TABLE (
  id uuid,
  nome text,
  slug text,
  status text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.nome, v.slug, v.status, v.created_at
  FROM public.vendedores v
  WHERE v.id = public.get_my_seller_id();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_seller_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_seller_profile() TO authenticated;

DROP POLICY IF EXISTS "Seller or admin can read seller data" ON public.vendedores;

DROP POLICY IF EXISTS "Sellers can view own sales" ON public.vendas;
CREATE POLICY "Sellers can view own sales"
ON public.vendas
FOR SELECT
TO authenticated
USING (vendedor_id = public.get_my_seller_id());

-- Make safe public views explicit and keep sensitive email columns off public-facing reads.
CREATE OR REPLACE VIEW public.mentors_public AS
SELECT id, user_id, name, avatar_url, specialty, bio, created_at
FROM public.mentors;

CREATE OR REPLACE VIEW public.mentoring_sessions_public AS
SELECT id, title, description, scheduled_at, duration_minutes, meeting_url, max_attendees, mentor_id, mentor_name, session_type, is_active, created_at
FROM public.mentoring_sessions;

CREATE OR REPLACE VIEW public.vendedores_public AS
SELECT id, nome, slug, status, created_at
FROM public.vendedores;

GRANT SELECT ON public.mentors_public TO anon, authenticated;
GRANT SELECT ON public.mentoring_sessions_public TO authenticated;
GRANT SELECT ON public.vendedores_public TO anon, authenticated;

-- Harden email-returning profile search so it cannot be used outside staff tooling.
CREATE OR REPLACE FUNCTION public.search_profiles_with_email(search_query text)
RETURNS TABLE(user_id uuid, name text, bio text, avatar_url text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin_geral', 'admin', 'admin_conteudo', 'cx', 'marketing')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.name, p.bio, p.avatar_url, au.email::text
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.name ILIKE '%' || trim(search_query) || '%'
    AND length(trim(search_query)) >= 2
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles_with_email(text) TO authenticated;