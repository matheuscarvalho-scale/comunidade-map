-- Allow service role to update reminders (for the cron processor)
CREATE POLICY "Service role can update reminders"
ON webinar_email_reminders FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);