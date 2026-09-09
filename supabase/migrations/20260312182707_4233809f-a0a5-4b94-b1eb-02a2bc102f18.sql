CREATE OR REPLACE FUNCTION public.get_top_pages(days_back integer DEFAULT 30, limit_count integer DEFAULT 10)
 RETURNS TABLE(page_path text, view_count bigint, unique_users bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ma.page_path,
    COUNT(*) as view_count,
    COUNT(DISTINCT ma.user_id) as unique_users
  FROM member_analytics ma
  WHERE ma.event_type = 'page_view'
    AND ma.created_at >= now() - (days_back || ' days')::INTERVAL
    AND ma.page_path IS NOT NULL
    AND ma.page_path NOT LIKE '/admin%'
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = ma.user_id AND ur.role IN ('starter', 'pro', 'enterprise'))
  GROUP BY ma.page_path
  ORDER BY view_count DESC
  LIMIT limit_count;
END;
$function$;