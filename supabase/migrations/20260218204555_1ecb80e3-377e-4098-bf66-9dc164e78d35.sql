-- Allow secondary accounts to view their primary (titular) profile
CREATE POLICY "Secondary users can view primary user profile"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.secondary_logins sl
    WHERE sl.secondary_user_id = auth.uid()
      AND sl.primary_user_id = profiles.user_id
      AND sl.is_active = true
  )
);