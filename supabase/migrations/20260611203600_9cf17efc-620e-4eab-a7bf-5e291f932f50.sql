
-- Remove broad SELECT policies on profiles that leak subscription/financial columns.
-- Members and secondary users should read other profiles via the public-safe view (profiles_public),
-- which strips subscription_plan, subscription_status, pending_plan, upgrade_status, plan_locked, etc.
DROP POLICY IF EXISTS "Users can view connected profiles" ON public.profiles;
DROP POLICY IF EXISTS "Secondary users can view primary user profile" ON public.profiles;

-- Add admin SELECT policy on mentoring_email_reminders to mirror webinar_email_reminders
CREATE POLICY "Admins can view mentoring reminders"
ON public.mentoring_email_reminders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'admin_geral'::app_role)
);
