-- 1. Create secure view for content_items (hides video_url and cloudflare_video_uid)
CREATE VIEW public.content_items_public
WITH (security_invoker = on) AS
  SELECT 
    id, track_id, title, description, speaker, category,
    duration_minutes, order_index, thumbnail_url,
    presenter_name, presenter_bio, presenter_avatar,
    created_at
  FROM public.content_items;

-- 2. Create secure view for user_onboarding (hides personal data)
CREATE VIEW public.user_onboarding_public
WITH (security_invoker = on) AS
  SELECT 
    id, user_id, current_step, completed_at,
    terms_accepted_at, terms_version,
    created_at, updated_at
  FROM public.user_onboarding;

-- 3. Restrict base content_items SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view content items" ON public.content_items;

CREATE POLICY "Admins can view content items directly"
  ON public.content_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Restrict base user_onboarding SELECT - users can still see their own (needed for onboarding flow)
-- Keep existing policies as they are since users need to read/write their own onboarding data
-- But the public view hides sensitive fields for admin queries
