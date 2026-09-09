
-- Update cloudflare_videos RLS policy to use business instead of enterprise
DROP POLICY IF EXISTS "Users can view videos matching their access level" ON public.cloudflare_videos;

CREATE POLICY "Users can view videos matching their access level"
ON public.cloudflare_videos
FOR SELECT
TO authenticated
USING (
  (access_level = 'public'::video_access_level) OR 
  ((access_level = 'members'::video_access_level) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.subscription_status = 'active'::text))))) OR 
  ((access_level = 'pro'::video_access_level) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.subscription_status = 'active'::text) AND (profiles.subscription_plan = ANY (ARRAY['pro'::text, 'business'::text])))))) OR 
  ((access_level = 'enterprise'::video_access_level) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.subscription_status = 'active'::text) AND (profiles.subscription_plan = ANY (ARRAY['business'::text, 'enterprise'::text]))))))
);
