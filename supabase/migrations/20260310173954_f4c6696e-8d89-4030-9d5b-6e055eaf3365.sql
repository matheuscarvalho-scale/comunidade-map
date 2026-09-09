
CREATE OR REPLACE FUNCTION public.get_engagement_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_members INTEGER;
  active_7d INTEGER;
  inactive_20d INTEGER;
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

  SELECT COUNT(*) INTO inactive_20d
  FROM profiles p
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('starter', 'pro', 'enterprise'))
    AND NOT EXISTS (
      SELECT 1 FROM member_analytics ma
      WHERE ma.user_id = p.user_id
        AND ma.created_at >= now() - INTERVAL '20 days'
    )
    AND p.updated_at < now() - INTERVAL '20 days';

  SELECT COALESCE(AVG(duration_seconds), 0) INTO avg_session_seconds
  FROM member_analytics
  WHERE event_type = 'page_duration'
    AND created_at >= now() - INTERVAL '30 days';

  result := jsonb_build_object(
    'total_members', total_members,
    'active_7d', active_7d,
    'inactive_20d', inactive_20d,
    'avg_session_seconds', ROUND(avg_session_seconds)
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_inactive_members(inactive_days INTEGER DEFAULT 20, limit_count INTEGER DEFAULT 50)
RETURNS TABLE(user_id UUID, name TEXT, email TEXT, avatar_url TEXT, last_activity TIMESTAMPTZ, days_inactive INTEGER, subscription_plan TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('starter', 'pro', 'enterprise'))
    AND COALESCE(latest.last_seen, p.updated_at) < now() - (inactive_days || ' days')::INTERVAL
  ORDER BY COALESCE(latest.last_seen, p.updated_at) ASC NULLS FIRST
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_formation_completion_rates()
RETURNS TABLE(formation_id UUID, formation_title TEXT, total_lessons BIGINT, users_started BIGINT, users_completed BIGINT, completion_rate NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH formation_lesson_counts AS (
    SELECT fm.formation_id, COUNT(fl.id) as total_lessons
    FROM formation_modules fm
    JOIN formation_lessons fl ON fl.module_id = fm.id
    GROUP BY fm.formation_id
  ),
  member_users AS (
    SELECT DISTINCT ur.user_id FROM user_roles ur WHERE ur.role IN ('starter', 'pro', 'enterprise')
  ),
  user_formation_progress AS (
    SELECT 
      fm.formation_id,
      flp.user_id,
      COUNT(CASE WHEN flp.completed = true THEN 1 END) as completed_lessons
    FROM formation_lesson_progress flp
    JOIN formation_lessons fl ON fl.id = flp.lesson_id
    JOIN formation_modules fm ON fm.id = fl.module_id
    JOIN member_users mu ON mu.user_id = flp.user_id
    GROUP BY fm.formation_id, flp.user_id
  )
  SELECT 
    f.id as formation_id,
    f.title as formation_title,
    COALESCE(flc.total_lessons, 0) as total_lessons,
    COUNT(DISTINCT ufp.user_id) as users_started,
    COUNT(DISTINCT CASE WHEN ufp.completed_lessons >= flc.total_lessons THEN ufp.user_id END) as users_completed,
    CASE 
      WHEN COUNT(DISTINCT ufp.user_id) > 0 
      THEN ROUND(COUNT(DISTINCT CASE WHEN ufp.completed_lessons >= flc.total_lessons THEN ufp.user_id END)::NUMERIC / COUNT(DISTINCT ufp.user_id) * 100, 1)
      ELSE 0
    END as completion_rate
  FROM formations f
  LEFT JOIN formation_lesson_counts flc ON flc.formation_id = f.id
  LEFT JOIN user_formation_progress ufp ON ufp.formation_id = f.id
  WHERE f.is_published = true
  GROUP BY f.id, f.title, flc.total_lessons
  ORDER BY users_started DESC;
END;
$$
