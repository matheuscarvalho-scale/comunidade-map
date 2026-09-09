
-- Make profiles_admin SECURITY DEFINER so admins can still read sensitive cols
-- even after column-level revokes on the base table. The view already filters
-- internally with has_role()/has_permission() so non-admins get zero rows.
ALTER VIEW public.profiles_admin SET (security_invoker = off);
GRANT SELECT ON public.profiles_admin TO authenticated;

-- Revoke column-level SELECT on subscription/upgrade fields from regular roles.
-- Owner still reads via get_my_subscription() RPC (SECURITY DEFINER).
-- Admin queries must use public.profiles_admin from now on.
REVOKE SELECT (
  subscription_plan,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  pending_plan,
  upgrade_status,
  upgrade_requested_at,
  plan_locked
) ON public.profiles FROM authenticated, anon;
