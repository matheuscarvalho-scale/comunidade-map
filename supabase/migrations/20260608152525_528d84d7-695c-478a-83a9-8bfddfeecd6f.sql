-- Explicit deny: only service_role can touch internal_tokens.
-- Authenticated/anon get a restrictive policy that always returns false,
-- so any future permissive policy added by mistake cannot expose tokens.
REVOKE ALL ON public.internal_tokens FROM anon, authenticated;
GRANT ALL ON public.internal_tokens TO service_role;

CREATE POLICY "Deny all access to internal_tokens (non-service)"
ON public.internal_tokens
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);