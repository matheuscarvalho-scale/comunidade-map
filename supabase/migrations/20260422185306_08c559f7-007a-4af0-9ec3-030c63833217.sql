-- Allow authenticated users to read content items from active tracks
-- This grants visibility through content_items_public view (which uses security_invoker)
CREATE POLICY "Authenticated users can view items from active tracks"
ON public.content_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content_tracks ct
    WHERE ct.id = content_items.track_id
      AND ct.is_active = true
  )
);