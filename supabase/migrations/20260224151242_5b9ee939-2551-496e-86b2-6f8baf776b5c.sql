-- Security linter cleanups related to service-only tables/policies

-- password_reset_attempts: RLS is enabled; add explicit service_role-only policy
DROP POLICY IF EXISTS "Service role only" ON public.password_reset_attempts;
CREATE POLICY "Service role only"
ON public.password_reset_attempts
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- achievement_notifications: prevent arbitrary inserts for other users
DROP POLICY IF EXISTS "System can insert notifications" ON public.achievement_notifications;
CREATE POLICY "Users can insert own notifications"
ON public.achievement_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- mentoring_email_reminders: service role only
DROP POLICY IF EXISTS "Service role can manage mentoring reminders" ON public.mentoring_email_reminders;
CREATE POLICY "Service role can manage mentoring reminders"
ON public.mentoring_email_reminders
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- webhook_logs: service role only
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON public.webhook_logs;
CREATE POLICY "Service role can insert webhook logs"
ON public.webhook_logs
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can update webhook logs" ON public.webhook_logs;
CREATE POLICY "Service role can update webhook logs"
ON public.webhook_logs
FOR UPDATE
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');