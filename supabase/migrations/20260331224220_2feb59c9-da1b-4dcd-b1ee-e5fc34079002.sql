DROP VIEW IF EXISTS public.content_items_public;

CREATE VIEW public.content_items_public
WITH (security_invoker = on) AS
  SELECT 
    id, track_id, title, description, speaker, category,
    cloudflare_video_uid,
    duration_minutes, order_index, thumbnail_url,
    presenter_name, presenter_bio, presenter_avatar,
    created_at
  FROM public.content_items;