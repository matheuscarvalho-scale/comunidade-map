
-- RPC: Get content track completion rates (Trilhas de Conteúdo, incl. Mentorias Gravadas / Webinars)
CREATE OR REPLACE FUNCTION public.get_content_track_completion_rates()
RETURNS TABLE(track_id UUID, track_title TEXT, track_slug TEXT, total_items BIGINT, users_started BIGINT, users_completed BIGINT, completion_rate NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH track_item_counts AS (
    SELECT ci.track_id, COUNT(ci.id) as total_items
    FROM content_items ci
    GROUP BY ci.track_id
  ),
  user_track_progress AS (
    SELECT
      ci.track_id,
      cip.user_id,
      COUNT(CASE WHEN cip.completed = true THEN 1 END) as completed_items
    FROM content_item_progress cip
    JOIN content_items ci ON ci.id = cip.item_id
    GROUP BY ci.track_id, cip.user_id
  )
  SELECT
    t.id as track_id,
    t.title as track_title,
    t.slug as track_slug,
    COALESCE(tic.total_items, 0) as total_items,
    COUNT(DISTINCT utp.user_id) as users_started,
    COUNT(DISTINCT CASE WHEN utp.completed_items >= tic.total_items THEN utp.user_id END) as users_completed,
    CASE
      WHEN COUNT(DISTINCT utp.user_id) > 0
      THEN ROUND(COUNT(DISTINCT CASE WHEN utp.completed_items >= tic.total_items THEN utp.user_id END)::NUMERIC / COUNT(DISTINCT utp.user_id) * 100, 1)
      ELSE 0
    END as completion_rate
  FROM content_tracks t
  LEFT JOIN track_item_counts tic ON tic.track_id = t.id
  LEFT JOIN user_track_progress utp ON utp.track_id = t.id
  WHERE t.is_active = true
  GROUP BY t.id, t.title, t.slug, tic.total_items
  ORDER BY users_started DESC;
END;
$$;

-- RPC: Get per-item completion stats (individual palestras/mentorias within a track)
CREATE OR REPLACE FUNCTION public.get_content_item_completion_stats(p_track_id UUID DEFAULT NULL)
RETURNS TABLE(item_id UUID, item_title TEXT, track_id UUID, track_title TEXT, track_slug TEXT, presenter_name TEXT, duration_minutes INTEGER, users_completed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id as item_id,
    ci.title as item_title,
    t.id as track_id,
    t.title as track_title,
    t.slug as track_slug,
    COALESCE(ci.presenter_name, ci.speaker) as presenter_name,
    ci.duration_minutes,
    COUNT(DISTINCT CASE WHEN cip.completed = true THEN cip.user_id END) as users_completed
  FROM content_items ci
  JOIN content_tracks t ON t.id = ci.track_id
  LEFT JOIN content_item_progress cip ON cip.item_id = ci.id
  WHERE (p_track_id IS NULL OR ci.track_id = p_track_id)
  GROUP BY ci.id, ci.title, t.id, t.title, t.slug, ci.presenter_name, ci.speaker, ci.duration_minutes, ci.order_index
  ORDER BY ci.order_index ASC, users_completed DESC;
END;
$$;
