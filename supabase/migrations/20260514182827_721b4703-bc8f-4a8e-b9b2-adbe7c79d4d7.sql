-- 1. member_analytics: users can view their own
CREATE POLICY "Users can view own analytics"
ON public.member_analytics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. mentoring_email_reminders: users can view their own
CREATE POLICY "Users can view own mentoring reminders"
ON public.mentoring_email_reminders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. churn_alert_logs: explicit service-role insert policy (clarity; service role bypasses RLS anyway)
CREATE POLICY "Service role can insert churn alert logs"
ON public.churn_alert_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. formation-videos bucket: restrict reads to users with active subscription OR admin/marketing
DROP POLICY IF EXISTS "Authenticated can view formation videos" ON storage.objects;
CREATE POLICY "Active subscribers can view formation videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'formation-videos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'marketing'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.subscription_status = 'active'
        AND (p.subscription_end_date IS NULL OR p.subscription_end_date > now())
    )
  )
);

-- 5. notify_new_track: set fixed search_path
CREATE OR REPLACE FUNCTION public.notify_new_track()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) AND NEW.is_coming_soon = false THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, '🎯 Nova Trilha de Conteúdo', 'A trilha "' || NEW.title || '" está disponível!', 'new_track', NEW.id);
  ELSIF NEW.is_active = true AND NEW.is_coming_soon = false AND OLD IS NOT NULL AND OLD.is_coming_soon = true THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, '🎯 Nova Trilha de Conteúdo', 'A trilha "' || NEW.title || '" está disponível!', 'new_track', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;