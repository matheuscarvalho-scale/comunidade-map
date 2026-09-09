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
      -- qualquer papel atribuído (contas internas / equipe / planos)
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
      -- perfil próprio com acesso, espelhando a regra do front
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
      -- sem perfil criado: o front também libera
      OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid())
      -- login secundário cujo primário tem acesso
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
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_member() TO authenticated, service_role;