
-- P3: Restrict cashback_usage UPDATE for users to safe fields only
DROP POLICY IF EXISTS "Users can update own cashback usage" ON public.cashback_usage;

CREATE POLICY "Users can update own cashback usage"
ON public.cashback_usage
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);

-- P5: Remove redundant vendedores SELECT policy
DROP POLICY IF EXISTS "Sellers can view own record" ON public.vendedores;
