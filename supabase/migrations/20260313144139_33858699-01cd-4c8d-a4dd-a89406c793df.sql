
CREATE OR REPLACE FUNCTION public.get_access_by_hour(_days_ago integer DEFAULT 30)
RETURNS TABLE(hour_of_day integer, page_views bigint, unique_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    EXTRACT(HOUR FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER as hour_of_day,
    COUNT(*)::BIGINT as page_views,
    COUNT(DISTINCT ma.user_id)::BIGINT as unique_users
  FROM member_analytics ma
  WHERE ma.event_type = 'page_view'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY EXTRACT(HOUR FROM ma.created_at AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY hour_of_day;
$$;
