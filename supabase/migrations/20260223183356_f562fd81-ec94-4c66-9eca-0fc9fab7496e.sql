
-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage feature toggles" ON public.feature_toggles;
DROP POLICY IF EXISTS "Anyone can view feature toggles" ON public.feature_toggles;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can manage feature toggles"
ON public.feature_toggles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view feature toggles"
ON public.feature_toggles
FOR SELECT
TO authenticated
USING (true);
