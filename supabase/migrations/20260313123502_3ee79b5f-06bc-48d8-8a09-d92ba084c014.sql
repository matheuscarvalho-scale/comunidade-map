
CREATE OR REPLACE FUNCTION public.get_page_click_details(
  _page_paths text[],
  _days_ago integer DEFAULT 30
)
RETURNS TABLE(label text, element_type text, category text, click_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(event_data->>'label', 'Desconhecido') as label,
    COALESCE(event_data->>'element_type', 'elemento') as element_type,
    COALESCE(event_data->>'category', 'pagina') as category,
    COUNT(*) as click_count
  FROM member_analytics
  WHERE event_type = 'click'
    AND page_path = ANY(_page_paths)
    AND created_at >= now() - (_days_ago || ' days')::interval
  GROUP BY 
    event_data->>'label',
    event_data->>'element_type',
    event_data->>'category'
  ORDER BY click_count DESC;
$$;
