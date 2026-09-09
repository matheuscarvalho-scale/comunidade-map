CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'admin_geral'::app_role)
      OR has_role(auth.uid(), 'admin_conteudo'::app_role)
      OR has_role(auth.uid(), 'marketing'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.subscription_status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.secondary_logins sl
        JOIN public.profiles pp ON pp.id = sl.primary_user_id
        WHERE sl.secondary_user_id = auth.uid()
          AND sl.is_active = true
          AND pp.subscription_status = 'active'
      )
    )
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_member() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_active_member() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_active_member() TO authenticated, service_role;