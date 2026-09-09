-- Remove triggers duplicados que disparam webhook 2x
DROP TRIGGER IF EXISTS notify_new_formation ON public.formations;
DROP TRIGGER IF EXISTS notify_new_content_track ON public.content_tracks;
DROP TRIGGER IF EXISTS notify_new_content_item ON public.content_items;
DROP TRIGGER IF EXISTS notify_on_resource_activated ON public.resources;