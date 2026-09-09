-- ============================================================
-- Security fixes — error level findings
-- ============================================================

-- 1) user_achievements: drop broad cross-user SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view unlocked achievements" ON public.user_achievements;

-- Leaderboard RPC (returns aggregate only, no per-row exposure)
CREATE OR REPLACE FUNCTION public.get_leaderboard_with_achievements()
RETURNS TABLE(user_id uuid, name text, avatar_url text, total_points integer, achievements_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH internal_role_users AS (
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('admin','admin_geral','admin_financeiro','admin_conteudo','cx','comercial','marketing','automacao')
  ),
  excluded AS (
    SELECT user_id FROM internal_role_users
    UNION
    SELECT unnest(ARRAY[
      '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid,
      '1894fbbc-eb90-45f3-9abb-c67065393c31'::uuid,
      'e4e8f871-cedd-47ab-9e14-3c52eed7d40e'::uuid,
      '9747c48e-ab50-4d33-82f6-36e8a4d94398'::uuid,
      '69add853-127c-411d-8f68-2051f278e84c'::uuid,
      '297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf'::uuid
    ])
  )
  SELECT 
    p.user_id,
    p.name,
    p.avatar_url,
    COALESCE(p.total_points, 0) AS total_points,
    COALESCE((SELECT COUNT(*) FROM public.user_achievements ua WHERE ua.user_id = p.user_id AND ua.unlocked_at IS NOT NULL), 0) AS achievements_count
  FROM public.profiles p
  WHERE p.is_public = true
    AND p.user_id NOT IN (SELECT user_id FROM excluded)
  ORDER BY p.total_points DESC NULLS LAST
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_with_achievements() TO authenticated;

-- 2) profiles: revoke SELECT on subscription/billing columns from authenticated/anon
REVOKE SELECT (subscription_plan, subscription_status, subscription_start_date, subscription_end_date, pending_plan, upgrade_status, upgrade_requested_at)
  ON public.profiles FROM authenticated, anon;

-- Owner subscription RPC
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE(
  subscription_status text,
  subscription_plan text,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  pending_plan text,
  upgrade_status text,
  upgrade_requested_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT subscription_status, subscription_plan, subscription_start_date, subscription_end_date, pending_plan, upgrade_status, upgrade_requested_at
  FROM public.profiles WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_subscription() TO authenticated;

-- Admin view exposing all profile cols (definer view, internal admin check)
CREATE OR REPLACE VIEW public.profiles_admin AS
SELECT * FROM public.profiles
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.profiles_admin TO authenticated;

-- 3) Hardcoded provision token: nothing to do in SQL — fixed in edge function code
-- (token rotation handled via Deno.env.get and PROVISION_SECRET)

COMMENT ON FUNCTION public.get_my_subscription() IS 'Owner-only access to billing fields (column SELECT revoked from authenticated)';
COMMENT ON VIEW public.profiles_admin IS 'Admin-only view exposing all profile columns including billing. Internal has_role check.';
