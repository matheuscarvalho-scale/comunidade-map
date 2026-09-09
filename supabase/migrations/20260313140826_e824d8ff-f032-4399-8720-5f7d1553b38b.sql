
CREATE OR REPLACE FUNCTION public.get_clicks_by_page(_days_ago integer DEFAULT 30)
RETURNS TABLE(page_path text, click_count bigint, unique_users bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ma.page_path,
    COUNT(*)::BIGINT as click_count,
    COUNT(DISTINCT ma.user_id)::BIGINT as unique_users
  FROM member_analytics ma
  WHERE ma.event_type = 'click'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY ma.page_path
  ORDER BY click_count DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_top_clicked_elements(_days_ago integer DEFAULT 30, _limit integer DEFAULT 20)
RETURNS TABLE(label text, element_type text, page_path text, click_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(event_data->>'label', 'Desconhecido') as label,
    COALESCE(event_data->>'element_type', 'elemento') as element_type,
    ma.page_path,
    COUNT(*)::BIGINT as click_count
  FROM member_analytics ma
  WHERE ma.event_type = 'click'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path NOT LIKE '/admin%'
    AND COALESCE(event_data->>'label', '') != ''
    AND COALESCE(event_data->>'label', '') != 'Desconhecido'
  GROUP BY event_data->>'label', event_data->>'element_type', ma.page_path
  ORDER BY click_count DESC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.get_clicks_over_time(_days_ago integer DEFAULT 30)
RETURNS TABLE(day date, click_count bigint, unique_users bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    DATE(ma.created_at) as day,
    COUNT(*)::BIGINT as click_count,
    COUNT(DISTINCT ma.user_id)::BIGINT as unique_users
  FROM member_analytics ma
  WHERE ma.event_type = 'click'
    AND ma.created_at >= now() - (_days_ago || ' days')::interval
    AND ma.page_path NOT LIKE '/admin%'
  GROUP BY DATE(ma.created_at)
  ORDER BY day;
$$;
