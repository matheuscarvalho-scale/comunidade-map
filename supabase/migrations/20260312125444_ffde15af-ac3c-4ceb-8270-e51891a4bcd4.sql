-- Update get_engagement_stats to use 30 days instead of 20
CREATE OR REPLACE FUNCTION public.get_engagement_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_members INTEGER;
  active_7d INTEGER;
  inactive_30d INTEGER;
  avg_session_seconds NUMERIC;
  result jsonb;
BEGIN
  SELECT COUNT(*) INTO total_members
  FROM profiles p
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('starter', 'pro', 'enterprise'));

  SELECT COUNT(DISTINCT p.user_id) INTO active_7d
  FROM profiles p
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('starter', 'pro', 'enterprise'))
    AND (
      EXISTS (SELECT 1 FROM member_analytics ma WHERE ma.user_id = p.user_id AND ma.created_at >= now() - INTERVAL '7 days')
      OR p.updated_at >= now() - INTERVAL '7 days'
    );

  SELECT COUNT(*) INTO inactive_30d
  FROM profiles p
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('starter', 'pro', 'enterprise'))
    AND NOT EXISTS (
      SELECT 1 FROM member_analytics ma
      WHERE ma.user_id = p.user_id
        AND ma.created_at >= now() - INTERVAL '30 days'
    )
    AND p.updated_at < now() - INTERVAL '30 days';

  SELECT COALESCE(AVG(duration_seconds), 0) INTO avg_session_seconds
  FROM member_analytics
  WHERE event_type = 'page_duration'
    AND created_at >= now() - INTERVAL '30 days';

  result := jsonb_build_object(
    'total_members', total_members,
    'active_7d', active_7d,
    'inactive_20d', inactive_30d,
    'avg_session_seconds', ROUND(avg_session_seconds)
  );

  RETURN result;
END;
$function$;

-- Create table to track churn alert emails sent (avoid duplicates)
CREATE TABLE IF NOT EXISTS public.churn_alert_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(user_id, alert_type)
);

ALTER TABLE public.churn_alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view churn alert logs" ON public.churn_alert_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));