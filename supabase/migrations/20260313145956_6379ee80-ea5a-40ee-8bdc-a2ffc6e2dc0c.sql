
CREATE OR REPLACE FUNCTION public.get_access_heatmap(_days_ago integer DEFAULT 30)
RETURNS TABLE(day_of_week integer, day_name text, hour_of_day integer, page_views bigint, unique_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    EXTRACT(DOW FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER as day_of_week,
    CASE EXTRACT(DOW FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER
      WHEN 0 THEN 'Dom'
      WHEN 1 THEN 'Seg'
      WHEN 2 THEN 'Ter'
      WHEN 3 THEN 'Qua'
      WHEN 4 THEN 'Qui'
      WHEN 5 THEN 'Sex'
      WHEN 6 THEN 'Sáb'
    END as day_name,
    EXTRACT(HOUR FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER as hour_of_day,
    COUNT(*)::BIGINT as page_views,
    COUNT(DISTINCT ma.user_id)::BIGINT as unique_users
  FROM member_analytics ma
  WHERE ma.event_type = 'page_view'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY 1, 2, 3
  ORDER BY 1, 3;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_access_calendar(_days_ago integer DEFAULT 90)
RETURNS TABLE(access_date date, page_views bigint, unique_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    DATE(ma.created_at AT TIME ZONE 'America/Sao_Paulo') as access_date,
    COUNT(*)::BIGINT as page_views,
    COUNT(DISTINCT ma.user_id)::BIGINT as unique_users
  FROM member_analytics ma
  WHERE ma.event_type = 'page_view'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY 1
  ORDER BY 1;
$$;
