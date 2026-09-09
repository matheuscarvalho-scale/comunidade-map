
-- Update auth gates in analytics RPCs to also accept analytics.manage permission
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
  internal_ids uuid[] := ARRAY[
    '69add853-127c-411d-8f68-2051f278e84c'::uuid,
    '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid,
    '1894fbbc-eb90-45f3-9abb-c67065393c31'::uuid,
    'e4e8f871-cedd-47ab-9e14-3c52eed7d40e'::uuid,
    '9747c48e-ab50-4d33-82f6-36e8a4d94398'::uuid,
    '297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf'::uuid,
    '634f99e0-131b-481c-816d-c14301568fe7'::uuid,
    'b7783f1f-5e44-46ad-b1f9-17fe451d0689'::uuid
  ];
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_permission(auth.uid(),'analytics.manage')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO total_members
  FROM public.profiles p
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
    )
    AND p.user_id <> ALL(internal_ids);

  SELECT COUNT(DISTINCT p.user_id) INTO active_7d
  FROM public.profiles p
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
    )
    AND p.user_id <> ALL(internal_ids)
    AND (
      EXISTS (SELECT 1 FROM public.member_analytics ma WHERE ma.user_id = p.user_id AND ma.created_at >= now() - INTERVAL '7 days')
      OR p.updated_at >= now() - INTERVAL '7 days'
    );

  SELECT COUNT(*) INTO inactive_30d
  FROM public.profiles p
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
    )
    AND p.user_id <> ALL(internal_ids)
    AND NOT EXISTS (
      SELECT 1 FROM public.member_analytics ma
      WHERE ma.user_id = p.user_id
        AND ma.created_at >= now() - INTERVAL '30 days'
    )
    AND p.updated_at < now() - INTERVAL '30 days';

  SELECT COALESCE(AVG(duration_seconds), 0) INTO avg_session_seconds
  FROM public.member_analytics
  WHERE event_type = 'session_duration'
    AND created_at >= now() - INTERVAL '30 days'
    AND user_id <> ALL(internal_ids);

  result := jsonb_build_object(
    'total_members', total_members,
    'active_7d', active_7d,
    'inactive_20d', inactive_30d,
    'avg_session_seconds', ROUND(avg_session_seconds)
  );

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_pages(days_back integer DEFAULT 30, limit_count integer DEFAULT 10)
 RETURNS TABLE(page_path text, view_count bigint, unique_users bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_permission(auth.uid(),'analytics.manage')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    ma.page_path,
    COUNT(*) AS view_count,
    COUNT(DISTINCT ma.user_id) AS unique_users
  FROM public.member_analytics ma
  WHERE ma.event_type = 'page_view'
    AND ma.created_at >= now() - (days_back || ' days')::INTERVAL
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role IN ('starter', 'pro', 'enterprise'))
  GROUP BY ma.page_path
  ORDER BY view_count DESC
  LIMIT limit_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_formation_completion_rates()
 RETURNS TABLE(formation_id uuid, formation_title text, total_lessons bigint, users_started bigint, users_completed bigint, completion_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_permission(auth.uid(),'analytics.manage')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH formation_lesson_counts AS (
    SELECT fm.formation_id, COUNT(fl.id) AS total_lessons
    FROM public.formation_modules fm
    JOIN public.formation_lessons fl ON fl.module_id = fm.id
    GROUP BY fm.formation_id
  ),
  member_users AS (
    SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('starter', 'pro', 'enterprise')
  ),
  user_formation_progress AS (
    SELECT 
      fm.formation_id,
      flp.user_id,
      COUNT(CASE WHEN flp.completed = true THEN 1 END) AS completed_lessons
    FROM public.formation_lesson_progress flp
    JOIN public.formation_lessons fl ON fl.id = flp.lesson_id
    JOIN public.formation_modules fm ON fm.id = fl.module_id
    JOIN member_users mu ON mu.user_id = flp.user_id
    GROUP BY fm.formation_id, flp.user_id
  )
  SELECT 
    f.id AS formation_id,
    f.title AS formation_title,
    COALESCE(flc.total_lessons, 0) AS total_lessons,
    COUNT(DISTINCT ufp.user_id) AS users_started,
    COUNT(DISTINCT CASE WHEN ufp.completed_lessons >= flc.total_lessons THEN ufp.user_id END) AS users_completed,
    CASE 
      WHEN COUNT(DISTINCT ufp.user_id) > 0 
      THEN ROUND(COUNT(DISTINCT CASE WHEN ufp.completed_lessons >= flc.total_lessons THEN ufp.user_id END)::NUMERIC / COUNT(DISTINCT ufp.user_id) * 100, 1)
      ELSE 0
    END AS completion_rate
  FROM public.formations f
  LEFT JOIN formation_lesson_counts flc ON flc.formation_id = f.id
  LEFT JOIN user_formation_progress ufp ON ufp.formation_id = f.id
  WHERE f.is_published = true
  GROUP BY f.id, f.title, flc.total_lessons
  ORDER BY users_started DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_inactive_members(inactive_days integer DEFAULT 20, limit_count integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, name text, email text, avatar_url text, last_activity timestamp with time zone, days_inactive integer, subscription_plan text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  internal_ids uuid[] := ARRAY[
    '69add853-127c-411d-8f68-2051f278e84c'::uuid,
    '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid,
    '1894fbbc-eb90-45f3-9abb-c67065393c31'::uuid,
    'e4e8f871-cedd-47ab-9e14-3c52eed7d40e'::uuid,
    '9747c48e-ab50-4d33-82f6-36e8a4d94398'::uuid,
    '297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf'::uuid,
    '634f99e0-131b-481c-816d-c14301568fe7'::uuid,
    'b7783f1f-5e44-46ad-b1f9-17fe451d0689'::uuid
  ];
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_role(auth.uid(),'admin_financeiro'::app_role) OR public.has_permission(auth.uid(),'analytics.manage')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    p.user_id,
    p.name,
    au.email::TEXT,
    p.avatar_url,
    COALESCE(latest.last_seen, p.updated_at) AS last_activity,
    EXTRACT(DAY FROM now() - COALESCE(latest.last_seen, p.updated_at))::INTEGER AS days_inactive,
    p.subscription_plan
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT MAX(ma.created_at) AS last_seen
    FROM public.member_analytics ma
    WHERE ma.user_id = p.user_id
  ) latest ON true
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
    )
    AND p.user_id <> ALL(internal_ids)
    AND COALESCE(latest.last_seen, p.updated_at) < now() - (inactive_days || ' days')::INTERVAL
  ORDER BY COALESCE(latest.last_seen, p.updated_at) ASC NULLS FIRST
  LIMIT limit_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_clicks_by_page(_days_ago integer DEFAULT 30)
 RETURNS TABLE(page_path text, click_count bigint, unique_users bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_permission(auth.uid(),'analytics.manage')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    ma.page_path,
    COUNT(*)::BIGINT AS click_count,
    COUNT(DISTINCT ma.user_id)::BIGINT AS unique_users
  FROM public.member_analytics ma
  WHERE ma.event_type = 'click'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY ma.page_path
  ORDER BY click_count DESC;
END;
$function$;
