CREATE OR REPLACE FUNCTION public.is_active_member()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      -- papéis INTERNOS (equipe) liberam sempre; papéis de plano não
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role::text IN (
            'admin_geral','admin','admin_financeiro','admin_conteudo',
            'automacao','cx','comercial','marketing'
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND (
            p.subscription_status = 'active'
            OR (
              p.subscription_end_date IS NULL
              AND coalesce(p.subscription_status, '') NOT IN ('refunded', 'expired')
            )
          )
      )
      OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.secondary_logins sl
        JOIN public.profiles pp ON pp.user_id = sl.primary_user_id
        WHERE sl.secondary_user_id = auth.uid()
          AND sl.is_active = true
          AND (
            pp.subscription_status = 'active'
            OR (
              pp.subscription_end_date IS NULL
              AND coalesce(pp.subscription_status, '') NOT IN ('refunded', 'expired')
            )
          )
      )
    )
$function$;

REVOKE EXECUTE ON FUNCTION public.is_active_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_member() TO authenticated, service_role;