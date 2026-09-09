CREATE POLICY "Admins can view all onboarding"
ON public.user_onboarding
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));