CREATE OR REPLACE FUNCTION public.get_my_seller_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id
  FROM public.vendedores v
  JOIN auth.users u ON u.id = auth.uid()
  WHERE lower(v.email) = lower(u.email::text)
    AND v.status = 'ativo'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.can_access_cloudflare_video(public.video_access_level) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_seller_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_seller_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_profiles_with_email(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_access_cloudflare_video(public.video_access_level) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_seller_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_seller_profile() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_profiles_with_email(text) TO authenticated, service_role;