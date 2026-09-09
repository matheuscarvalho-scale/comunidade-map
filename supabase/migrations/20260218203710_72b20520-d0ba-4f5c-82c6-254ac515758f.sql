-- Drop the potentially recursive policy
DROP POLICY IF EXISTS "Secondary users can view org members" ON public.secondary_logins;

-- Create a security definer function to safely get the primary_user_id for a secondary user
CREATE OR REPLACE FUNCTION public.get_primary_user_id_for_secondary(_secondary_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT primary_user_id 
  FROM public.secondary_logins 
  WHERE secondary_user_id = _secondary_user_id
    AND is_active = true
  LIMIT 1;
$$;

-- Recreate the policy using the security definer function (no recursion)
CREATE POLICY "Secondary users can view org members"
ON public.secondary_logins
FOR SELECT
USING (
  primary_user_id = public.get_primary_user_id_for_secondary(auth.uid())
);