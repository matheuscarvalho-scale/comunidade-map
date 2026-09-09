
-- Analytics overview KPIs
CREATE OR REPLACE FUNCTION public.get_analytics_kpis(_days_ago integer DEFAULT 30)
RETURNS TABLE(
  total_events bigint,
  unique_users bigint,
  total_sessions bigint,
  total_page_views bigint,
  peak_hour integer,
  peak_hour_views bigint,
  peak_day_name text,
  peak_day_views bigint,
  top_page text,
  top_page_views bigint,
  prev_total_events bigint,
  prev_unique_users bigint,
  prev_page_views bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH current_period AS (
    SELECT * FROM member_analytics
    WHERE created_at >= now() - (_days_ago || ' days')::interval
      AND page_path IS NOT NULL
      AND page_path NOT LIKE '/admin%'
  ),
  prev_period AS (
    SELECT * FROM member_analytics
    WHERE created_at >= now() - (_days_ago * 2 || ' days')::interval
      AND created_at < now() - (_days_ago || ' days')::interval
      AND page_path IS NOT NULL
      AND page_path NOT LIKE '/admin%'
  ),
  peak_h AS (
    SELECT 
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER as h,
      COUNT(*)::BIGINT as cnt
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
      END as d_name,
      COUNT(*)::BIGINT as cnt
    FROM current_period WHERE event_type = 'page_view'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 1
  ),
  top_p AS (
    SELECT page_path, COUNT(*)::BIGINT as cnt
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
$$;

-- Page views over time (daily)
CREATE OR REPLACE FUNCTION public.get_page_views_over_time(_days_ago integer DEFAULT 30)
RETURNS TABLE(day date, page_views bigint, unique_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as day,
    COUNT(*)::BIGINT as page_views,
    COUNT(DISTINCT user_id)::BIGINT as unique_users
  FROM member_analytics
  WHERE event_type = 'page_view'
    AND created_at >= now() - (_days_ago || ' days')::interval
    AND page_path IS NOT NULL
    AND page_path NOT LIKE '/admin%'
  GROUP BY 1
  ORDER BY 1;
$$;

-- Top pages by page views
CREATE OR REPLACE FUNCTION public.get_top_pages_by_views(_days_ago integer DEFAULT 30, _limit integer DEFAULT 15)
RETURNS TABLE(page_path text, page_views bigint, unique_users bigint, avg_duration_seconds bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH views AS (
    SELECT 
      page_path,
      COUNT(*)::BIGINT as page_views,
      COUNT(DISTINCT user_id)::BIGINT as unique_users
    FROM member_analytics
    WHERE event_type = 'page_view'
      AND created_at >= now() - (_days_ago || ' days')::interval
      AND page_path IS NOT NULL
      AND page_path NOT LIKE '/admin%'
    GROUP BY 1
  ),
  durations AS (
    SELECT 
      page_path,
      COALESCE(AVG(duration_seconds), 0)::BIGINT as avg_dur
    FROM member_analytics
    WHERE event_type = 'page_duration'
      AND created_at >= now() - (_days_ago || ' days')::interval
      AND page_path IS NOT NULL
      AND page_path NOT LIKE '/admin%'
    GROUP BY 1
  )
  SELECT 
    v.page_path,
    v.page_views,
    v.unique_users,
    COALESCE(d.avg_dur, 0) as avg_duration_seconds
  FROM views v
  LEFT JOIN durations d ON d.page_path = v.page_path
  ORDER BY v.page_views DESC
  LIMIT _limit;
$$;

-- Weekday summary
CREATE OR REPLACE FUNCTION public.get_weekday_access_summary(_days_ago integer DEFAULT 30)
RETURNS TABLE(day_of_week integer, day_name text, page_views bigint, unique_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER as day_of_week,
    CASE EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER
      WHEN 0 THEN 'Dom'
      WHEN 1 THEN 'Seg'
      WHEN 2 THEN 'Ter'
      WHEN 3 THEN 'Qua'
      WHEN 4 THEN 'Qui'
      WHEN 5 THEN 'Sex'
      WHEN 6 THEN 'Sáb'
    END as day_name,
    COUNT(*)::BIGINT as page_views,
    COUNT(DISTINCT user_id)::BIGINT as unique_users
  FROM member_analytics
  WHERE event_type = 'page_view'
    AND created_at >= now() - (_days_ago || ' days')::interval
    AND page_path IS NOT NULL
    AND page_path NOT LIKE '/admin%'
  GROUP BY 1, 2
  ORDER BY 1;
$$;
