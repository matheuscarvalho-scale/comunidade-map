
CREATE OR REPLACE FUNCTION public.get_access_by_weekday(_days_ago integer DEFAULT 30)
RETURNS TABLE(day_of_week integer, day_name text, page_views bigint, unique_users bigint, avg_daily_views numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH daily_counts AS (
    SELECT 
      EXTRACT(DOW FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER as dow,
      DATE(ma.created_at AT TIME ZONE 'America/Sao_Paulo') as the_date,
      COUNT(*) as views,
      COUNT(DISTINCT ma.user_id) as users
    FROM member_analytics ma
    WHERE ma.event_type = 'page_view'
      AND ma.created_at >= now() - (_days_ago || ' days')::interval
      AND ma.page_path IS NOT NULL
      AND ma.page_path NOT LIKE '/admin%'
    GROUP BY dow, the_date
  )
  SELECT 
    dow as day_of_week,
    CASE dow
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda'
      WHEN 2 THEN 'Terça'
      WHEN 3 THEN 'Quarta'
      WHEN 4 THEN 'Quinta'
      WHEN 5 THEN 'Sexta'
      WHEN 6 THEN 'Sábado'
    END as day_name,
    SUM(views)::BIGINT as page_views,
    MAX(users)::BIGINT as unique_users,
    ROUND(AVG(views), 1) as avg_daily_views
  FROM daily_counts
  GROUP BY dow
  ORDER BY dow;
$$;
