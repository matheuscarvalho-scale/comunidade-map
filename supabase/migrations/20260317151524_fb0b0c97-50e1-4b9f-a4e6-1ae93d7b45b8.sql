
-- Fix get_engagement_stats to use new role names
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
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
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
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
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
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
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

-- Fix get_inactive_members to use new role names
CREATE OR REPLACE FUNCTION public.get_inactive_members(inactive_days integer DEFAULT 20, limit_count integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, name text, email text, avatar_url text, last_activity timestamp with time zone, days_inactive integer, subscription_plan text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.name,
    au.email::TEXT,
    p.avatar_url,
    COALESCE(latest.last_seen, p.updated_at) as last_activity,
    EXTRACT(DAY FROM now() - COALESCE(latest.last_seen, p.updated_at))::INTEGER as days_inactive,
    p.subscription_plan
  FROM profiles p
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT MAX(ma.created_at) as last_seen
    FROM member_analytics ma
    WHERE ma.user_id = p.user_id
  ) latest ON true
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
    AND COALESCE(latest.last_seen, p.updated_at) < now() - (inactive_days || ' days')::INTERVAL
  ORDER BY COALESCE(latest.last_seen, p.updated_at) ASC NULLS FIRST
  LIMIT limit_count;
END;
$function$;

-- Fix check_founding_member_achievement to use new role names
CREATE OR REPLACE FUNCTION public.check_founding_member_achievement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_achievement_id uuid := '368a54e0-4efa-438d-98d3-1cb2772dcaaf';
  v_profile_created timestamptz;
BEGIN
  IF NEW.role NOT IN ('basic', 'starter', 'pro', 'enterprise', 'business') THEN
    RETURN NEW;
  END IF;

  SELECT created_at INTO v_profile_created
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF v_profile_created IS NOT NULL AND v_profile_created < '2026-05-21T00:00:00Z' THEN
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
    VALUES (NEW.user_id, v_achievement_id, 1, now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    UPDATE profiles
    SET total_points = COALESCE(total_points, 0) + 50
    WHERE user_id = NEW.user_id;

    INSERT INTO achievement_notifications (user_id, achievement_id)
    VALUES (NEW.user_id, v_achievement_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
