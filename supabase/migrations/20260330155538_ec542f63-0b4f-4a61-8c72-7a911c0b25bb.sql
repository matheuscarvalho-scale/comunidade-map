-- Fix: mentoring_sessions admin ALL policy from {public} to {authenticated}
DROP POLICY IF EXISTS "Admins can manage sessions" ON public.mentoring_sessions;
CREATE POLICY "Admins can manage sessions"
  ON public.mentoring_sessions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix: webinars manage ALL policy from {public} to {authenticated}
DROP POLICY IF EXISTS "Users with webinars.manage can manage webinars" ON public.webinars;
CREATE POLICY "Users with webinars.manage can manage webinars"
  ON public.webinars
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_permission(auth.uid(), 'webinars.manage'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_permission(auth.uid(), 'webinars.manage'::text));