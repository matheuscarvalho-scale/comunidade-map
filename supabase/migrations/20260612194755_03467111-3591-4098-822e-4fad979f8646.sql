
-- =========================================================================
-- HARDEN SECURITY DEFINER FUNCTIONS (FINANCEIRAS + ANALYTICS)
-- Revoga acesso anon/public e adiciona guard de permissão admin no corpo.
-- Mantém EXECUTE para authenticated (admins via supabase-js) + service_role.
-- =========================================================================

-- ============== FINANCEIRAS / CASHBACK ==============

-- get_cashback_saldo_planos()
REVOKE ALL ON FUNCTION public.get_cashback_saldo_planos() FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_cashback_saldo_planos()
RETURNS TABLE(cliente text, email text, plano text, valor_plano numeric, cashback_gerado numeric, saldo_a_pagar numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_role(auth.uid(),'admin_financeiro'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    p.name AS cliente,
    u.email::text,
    p.subscription_plan AS plano,
    CASE 
      WHEN p.user_id = 'a70d7c42-bb8a-4824-a9f0-0b6f78bada9a'::uuid THEN 4764
      WHEN p.subscription_plan IN ('basic', 'starter') THEN 2364
      WHEN p.subscription_plan = 'pro' THEN 4764
      WHEN p.subscription_plan IN ('business', 'enterprise') THEN 11964
      ELSE 0
    END::NUMERIC AS valor_plano,
    COALESCE(SUM(cu.cashback_amount) FILTER (WHERE cu.status = 'approved'), 0)::NUMERIC AS cashback_gerado,
    (CASE 
      WHEN p.user_id = 'a70d7c42-bb8a-4824-a9f0-0b6f78bada9a'::uuid THEN 4764
      WHEN p.subscription_plan IN ('basic', 'starter') THEN 2364
      WHEN p.subscription_plan = 'pro' THEN 4764
      WHEN p.subscription_plan IN ('business', 'enterprise') THEN 11964
      ELSE 0
    END - COALESCE(SUM(cu.cashback_amount) FILTER (WHERE cu.status = 'approved'), 0))::NUMERIC AS saldo_a_pagar
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.cashback_usage cu ON cu.user_id = p.user_id
  WHERE p.subscription_plan IN ('basic', 'starter', 'pro', 'business', 'enterprise')
    AND p.subscription_status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.user_id
        AND ur.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing')
    )
    AND p.user_id NOT IN (
      '69add853-127c-411d-8f68-2051f278e84c'::uuid,
      '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid
    )
  GROUP BY p.name, u.email, p.subscription_plan, p.user_id
  ORDER BY p.name;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_cashback_saldo_planos() TO authenticated, service_role;

-- get_inactive_members(integer, integer)
REVOKE ALL ON FUNCTION public.get_inactive_members(integer, integer) FROM PUBLIC, anon;
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
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_role(auth.uid(),'admin_financeiro'::app_role)) THEN
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
GRANT EXECUTE ON FUNCTION public.get_inactive_members(integer, integer) TO authenticated, service_role;

-- get_cashback_dashboard_stats()
REVOKE ALL ON FUNCTION public.get_cashback_dashboard_stats() FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_cashback_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_role(auth.uid(),'admin_financeiro'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (
    SELECT json_build_object(
      'total_registros', COUNT(*),
      'confirmadas', COUNT(*) FILTER (WHERE status = 'confirmado'),
      'nao_converteu', COUNT(*) FILTER (WHERE status = 'nao_converteu'),
      'aguardando', COUNT(*) FILTER (WHERE status IS NULL OR status = 'aguardando' OR status = 'clicked'),
      'total_vendas', COALESCE(SUM(purchase_value) FILTER (WHERE status = 'confirmado'), 0),
      'total_cashback', COALESCE(SUM(cashback_value) FILTER (WHERE status = 'confirmado'), 0),
      'taxa_conversao', CASE WHEN COUNT(*) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE status = 'confirmado')::numeric / COUNT(*)::numeric) * 100, 1)
        ELSE 0 END
    )
    FROM public.partner_clicks
  );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_cashback_dashboard_stats() TO authenticated, service_role;

-- get_cashback_partner_performance()
REVOKE ALL ON FUNCTION public.get_cashback_partner_performance() FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_cashback_partner_performance()
RETURNS TABLE(partner_name text, cliques bigint, confirmadas bigint, taxa_conversao numeric, vendas numeric, cashback numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_role(auth.uid(),'admin_financeiro'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    pc.partner_name,
    COUNT(*)::BIGINT AS cliques,
    COUNT(*) FILTER (WHERE pc.status = 'confirmado')::BIGINT AS confirmadas,
    CASE WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE pc.status = 'confirmado')::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0 END AS taxa_conversao,
    COALESCE(SUM(pc.purchase_value) FILTER (WHERE pc.status = 'confirmado'), 0)::NUMERIC AS vendas,
    COALESCE(SUM(pc.cashback_value) FILTER (WHERE pc.status = 'confirmado'), 0)::NUMERIC AS cashback
  FROM public.partner_clicks pc
  GROUP BY pc.partner_name
  ORDER BY cliques DESC;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_cashback_partner_performance() TO authenticated, service_role;

-- ============== ANALYTICS / ACESSO ==============

-- get_analytics_kpis(integer)
REVOKE ALL ON FUNCTION public.get_analytics_kpis(integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_analytics_kpis(_days_ago integer DEFAULT 30)
RETURNS TABLE(total_events bigint, unique_users bigint, total_sessions bigint, total_page_views bigint, peak_hour integer, peak_hour_views bigint, peak_day_name text, peak_day_views bigint, top_page text, top_page_views bigint, prev_total_events bigint, prev_unique_users bigint, prev_page_views bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH current_period AS (
    SELECT * FROM public.member_analytics
    WHERE created_at >= now() - (_days_ago || ' days')::interval
      AND page_path IS NOT NULL
      AND page_path NOT LIKE '/admin%'
  ),
  prev_period AS (
    SELECT * FROM public.member_analytics
    WHERE created_at >= now() - (_days_ago * 2 || ' days')::interval
      AND created_at < now() - (_days_ago || ' days')::interval
      AND page_path IS NOT NULL
      AND page_path NOT LIKE '/admin%'
  ),
  peak_h AS (
    SELECT 
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS h,
      COUNT(*)::BIGINT AS cnt
    FROM current_period WHERE event_type = 'page_view'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 1
  ),
  peak_d AS (
    SELECT 
      CASE EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Segunda'
        WHEN 2 THEN 'Terça'
        WHEN 3 THEN 'Quarta'
        WHEN 4 THEN 'Quinta'
        WHEN 5 THEN 'Sexta'
        WHEN 6 THEN 'Sábado'
      END AS d_name,
      COUNT(*)::BIGINT AS cnt
    FROM current_period WHERE event_type = 'page_view'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 1
  ),
  top_p AS (
    SELECT page_path, COUNT(*)::BIGINT AS cnt
    FROM current_period WHERE event_type = 'page_view'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 1
  )
  SELECT
    (SELECT COUNT(*) FROM current_period)::BIGINT,
    (SELECT COUNT(DISTINCT user_id) FROM current_period)::BIGINT,
    (SELECT COUNT(DISTINCT session_id) FROM current_period)::BIGINT,
    (SELECT COUNT(*) FROM current_period WHERE event_type = 'page_view')::BIGINT,
    COALESCE((SELECT h FROM peak_h), 0),
    COALESCE((SELECT cnt FROM peak_h), 0)::BIGINT,
    COALESCE((SELECT d_name FROM peak_d), '-'),
    COALESCE((SELECT cnt FROM peak_d), 0)::BIGINT,
    COALESCE((SELECT page_path FROM top_p), '/'),
    COALESCE((SELECT cnt FROM top_p), 0)::BIGINT,
    (SELECT COUNT(*) FROM prev_period)::BIGINT,
    (SELECT COUNT(DISTINCT user_id) FROM prev_period)::BIGINT,
    (SELECT COUNT(*) FROM prev_period WHERE event_type = 'page_view')::BIGINT;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_analytics_kpis(integer) TO authenticated, service_role;

-- get_page_views_over_time(integer)
REVOKE ALL ON FUNCTION public.get_page_views_over_time(integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_page_views_over_time(_days_ago integer DEFAULT 30)
RETURNS TABLE(day date, page_views bigint, unique_users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    DATE(created_at AT TIME ZONE 'America/Sao_Paulo') AS day,
    COUNT(*)::BIGINT AS page_views,
    COUNT(DISTINCT user_id)::BIGINT AS unique_users
  FROM public.member_analytics
  WHERE event_type = 'page_view'
    AND created_at >= now() - (_days_ago || ' days')::interval
    AND page_path IS NOT NULL
    AND page_path NOT LIKE '/admin%'
  GROUP BY 1
  ORDER BY 1;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_page_views_over_time(integer) TO authenticated, service_role;

-- get_top_pages_by_views(integer, integer)
REVOKE ALL ON FUNCTION public.get_top_pages_by_views(integer, integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_top_pages_by_views(_days_ago integer DEFAULT 30, _limit integer DEFAULT 15)
RETURNS TABLE(page_path text, page_views bigint, unique_users bigint, avg_duration_seconds bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH views AS (
    SELECT 
      ma.page_path,
      COUNT(*)::BIGINT AS page_views,
      COUNT(DISTINCT ma.user_id)::BIGINT AS unique_users
    FROM public.member_analytics ma
    WHERE ma.event_type = 'page_view'
      AND ma.created_at >= now() - (_days_ago || ' days')::interval
      AND ma.page_path IS NOT NULL
      AND ma.page_path NOT LIKE '/admin%'
    GROUP BY 1
  ),
  durations AS (
    SELECT 
      ma.page_path,
      COALESCE(AVG(ma.duration_seconds), 0)::BIGINT AS avg_dur
    FROM public.member_analytics ma
    WHERE ma.event_type = 'page_duration'
      AND ma.created_at >= now() - (_days_ago || ' days')::interval
      AND ma.page_path IS NOT NULL
      AND ma.page_path NOT LIKE '/admin%'
    GROUP BY 1
  )
  SELECT 
    v.page_path,
    v.page_views,
    v.unique_users,
    COALESCE(d.avg_dur, 0) AS avg_duration_seconds
  FROM views v
  LEFT JOIN durations d ON d.page_path = v.page_path
  ORDER BY v.page_views DESC
  LIMIT _limit;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_top_pages_by_views(integer, integer) TO authenticated, service_role;

-- get_weekday_access_summary(integer)
REVOKE ALL ON FUNCTION public.get_weekday_access_summary(integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_weekday_access_summary(_days_ago integer DEFAULT 30)
RETURNS TABLE(day_of_week integer, day_name text, page_views bigint, unique_users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    EXTRACT(DOW FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS day_of_week,
    CASE EXTRACT(DOW FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER
      WHEN 0 THEN 'Dom'
      WHEN 1 THEN 'Seg'
      WHEN 2 THEN 'Ter'
      WHEN 3 THEN 'Qua'
      WHEN 4 THEN 'Qui'
      WHEN 5 THEN 'Sex'
      WHEN 6 THEN 'Sáb'
    END AS day_name,
    COUNT(*)::BIGINT AS page_views,
    COUNT(DISTINCT ma.user_id)::BIGINT AS unique_users
  FROM public.member_analytics ma
  WHERE ma.event_type = 'page_view'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY 1, 2
  ORDER BY 1;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_weekday_access_summary(integer) TO authenticated, service_role;

-- get_clicks_by_page(integer)
REVOKE ALL ON FUNCTION public.get_clicks_by_page(integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_clicks_by_page(_days_ago integer DEFAULT 30)
RETURNS TABLE(page_path text, click_count bigint, unique_users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
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
GRANT EXECUTE ON FUNCTION public.get_clicks_by_page(integer) TO authenticated, service_role;

-- get_top_clicked_elements(integer, integer)
REVOKE ALL ON FUNCTION public.get_top_clicked_elements(integer, integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_top_clicked_elements(_days_ago integer DEFAULT 30, _limit integer DEFAULT 20)
RETURNS TABLE(label text, element_type text, page_path text, click_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    COALESCE(ma.event_data->>'label', 'Desconhecido') AS label,
    COALESCE(ma.event_data->>'element_type', 'elemento') AS element_type,
    ma.page_path,
    COUNT(*)::BIGINT AS click_count
  FROM public.member_analytics ma
  WHERE ma.event_type = 'click'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path NOT LIKE '/admin%'
    AND COALESCE(ma.event_data->>'label', '') != ''
    AND COALESCE(ma.event_data->>'label', '') != 'Desconhecido'
  GROUP BY ma.event_data->>'label', ma.event_data->>'element_type', ma.page_path
  ORDER BY click_count DESC
  LIMIT _limit;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_top_clicked_elements(integer, integer) TO authenticated, service_role;

-- get_clicks_over_time(integer)
REVOKE ALL ON FUNCTION public.get_clicks_over_time(integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_clicks_over_time(_days_ago integer DEFAULT 30)
RETURNS TABLE(day date, click_count bigint, unique_users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    DATE(ma.created_at) AS day,
    COUNT(*)::BIGINT AS click_count,
    COUNT(DISTINCT ma.user_id)::BIGINT AS unique_users
  FROM public.member_analytics ma
  WHERE ma.event_type = 'click'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY DATE(ma.created_at)
  ORDER BY day;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_clicks_over_time(integer) TO authenticated, service_role;

-- get_access_by_hour(integer)
REVOKE ALL ON FUNCTION public.get_access_by_hour(integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_access_by_hour(_days_ago integer DEFAULT 30)
RETURNS TABLE(hour_of_day integer, page_views bigint, unique_users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS hour_of_day,
    COUNT(*)::BIGINT AS page_views,
    COUNT(DISTINCT ma.user_id)::BIGINT AS unique_users
  FROM public.member_analytics ma
  WHERE ma.event_type = 'page_view'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY EXTRACT(HOUR FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY hour_of_day;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_access_by_hour(integer) TO authenticated, service_role;

-- get_access_by_weekday(integer)
REVOKE ALL ON FUNCTION public.get_access_by_weekday(integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_access_by_weekday(_days_ago integer DEFAULT 30)
RETURNS TABLE(day_of_week integer, day_name text, page_views bigint, unique_users bigint, avg_daily_views numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH daily_counts AS (
    SELECT 
      EXTRACT(DOW FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS dow,
      DATE(ma.created_at AT TIME ZONE 'America/Sao_Paulo') AS the_date,
      COUNT(*) AS views,
      COUNT(DISTINCT ma.user_id) AS users
    FROM public.member_analytics ma
    WHERE ma.event_type = 'page_view'
      AND ma.created_at >= now() - (_days_ago || ' days')::interval
      AND ma.page_path IS NOT NULL
      AND ma.page_path NOT LIKE '/admin%'
    GROUP BY dow, the_date
  )
  SELECT 
    dc.dow AS day_of_week,
    CASE dc.dow
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda'
      WHEN 2 THEN 'Terça'
      WHEN 3 THEN 'Quarta'
      WHEN 4 THEN 'Quinta'
      WHEN 5 THEN 'Sexta'
      WHEN 6 THEN 'Sábado'
    END AS day_name,
    SUM(dc.views)::BIGINT AS page_views,
    MAX(dc.users)::BIGINT AS unique_users,
    ROUND(AVG(dc.views), 1) AS avg_daily_views
  FROM daily_counts dc
  GROUP BY dc.dow
  ORDER BY dc.dow;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_access_by_weekday(integer) TO authenticated, service_role;

-- get_access_heatmap(integer)
REVOKE ALL ON FUNCTION public.get_access_heatmap(integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_access_heatmap(_days_ago integer DEFAULT 30)
RETURNS TABLE(day_of_week integer, day_name text, hour_of_day integer, page_views bigint, unique_users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    EXTRACT(DOW FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS day_of_week,
    CASE EXTRACT(DOW FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER
      WHEN 0 THEN 'Dom'
      WHEN 1 THEN 'Seg'
      WHEN 2 THEN 'Ter'
      WHEN 3 THEN 'Qua'
      WHEN 4 THEN 'Qui'
      WHEN 5 THEN 'Sex'
      WHEN 6 THEN 'Sáb'
    END AS day_name,
    EXTRACT(HOUR FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS hour_of_day,
    COUNT(*)::BIGINT AS page_views,
    COUNT(DISTINCT ma.user_id)::BIGINT AS unique_users
  FROM public.member_analytics ma
  WHERE ma.event_type = 'page_view'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY 1, 2, 3
  ORDER BY 1, 3;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_access_heatmap(integer) TO authenticated, service_role;

-- get_daily_access_calendar(integer)
REVOKE ALL ON FUNCTION public.get_daily_access_calendar(integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_daily_access_calendar(_days_ago integer DEFAULT 90)
RETURNS TABLE(access_date date, page_views bigint, unique_users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    DATE(ma.created_at AT TIME ZONE 'America/Sao_Paulo') AS access_date,
    COUNT(*)::BIGINT AS page_views,
    COUNT(DISTINCT ma.user_id)::BIGINT AS unique_users
  FROM public.member_analytics ma
  WHERE ma.event_type = 'page_view'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY 1
  ORDER BY 1;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_daily_access_calendar(integer) TO authenticated, service_role;

-- get_engagement_stats()
REVOKE ALL ON FUNCTION public.get_engagement_stats() FROM PUBLIC, anon;
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
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
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
GRANT EXECUTE ON FUNCTION public.get_engagement_stats() TO authenticated, service_role;

-- get_top_pages(integer, integer)
REVOKE ALL ON FUNCTION public.get_top_pages(integer, integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_top_pages(days_back integer DEFAULT 30, limit_count integer DEFAULT 10)
RETURNS TABLE(page_path text, view_count bigint, unique_users bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
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
GRANT EXECUTE ON FUNCTION public.get_top_pages(integer, integer) TO authenticated, service_role;

-- get_formation_completion_rates()
REVOKE ALL ON FUNCTION public.get_formation_completion_rates() FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_formation_completion_rates()
RETURNS TABLE(formation_id uuid, formation_title text, total_lessons bigint, users_started bigint, users_completed bigint, completion_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
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
GRANT EXECUTE ON FUNCTION public.get_formation_completion_rates() TO authenticated, service_role;

-- get_page_click_details(text[], integer)
REVOKE ALL ON FUNCTION public.get_page_click_details(text[], integer) FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.get_page_click_details(_page_paths text[], _days_ago integer DEFAULT 30)
RETURNS TABLE(label text, element_type text, category text, click_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT 
    COALESCE(ma.event_data->>'label', 'Desconhecido') AS label,
    COALESCE(ma.event_data->>'element_type', 'elemento') AS element_type,
    COALESCE(ma.event_data->>'category', 'pagina') AS category,
    COUNT(*) AS click_count
  FROM public.member_analytics ma
  WHERE ma.event_type = 'click'
    AND ma.page_path = ANY(_page_paths)
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
  GROUP BY 
    ma.event_data->>'label',
    ma.event_data->>'element_type',
    ma.event_data->>'category'
  ORDER BY click_count DESC;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_page_click_details(text[], integer) TO authenticated, service_role;
