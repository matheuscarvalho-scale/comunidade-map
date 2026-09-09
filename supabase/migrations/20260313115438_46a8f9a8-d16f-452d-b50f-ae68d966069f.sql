
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
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('starter', 'pro', 'enterprise'))
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing')
    )
    AND p.user_id NOT IN (
      '69add853-127c-411d-8f68-2051f278e84c'::uuid,
      '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid
    );

  SELECT COUNT(DISTINCT p.user_id) INTO active_7d
  FROM profiles p
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('starter', 'pro', 'enterprise'))
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing')
    )
    AND p.user_id NOT IN (
      '69add853-127c-411d-8f68-2051f278e84c'::uuid,
      '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid
    )
    AND (
      EXISTS (SELECT 1 FROM member_analytics ma WHERE ma.user_id = p.user_id AND ma.created_at >= now() - INTERVAL '7 days')
      OR p.updated_at >= now() - INTERVAL '7 days'
    );

  SELECT COUNT(*) INTO inactive_30d
  FROM profiles p
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('starter', 'pro', 'enterprise'))
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing')
    )
    AND p.user_id NOT IN (
      '69add853-127c-411d-8f68-2051f278e84c'::uuid,
      '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid
    )
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
