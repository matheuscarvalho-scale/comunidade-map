
-- 7. suggestion_votes: the policy already exists with correct name, just need to ensure it's on authenticated
-- Skip since it already exists

-- 8. post_replies: check if already applied
DROP POLICY IF EXISTS "Authenticated users can view replies" ON public.post_replies;
CREATE POLICY "Authenticated users can view replies"
  ON public.post_replies FOR SELECT TO authenticated
  USING (true);

-- 9. webinars: fix SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view webinars" ON public.webinars;
DROP POLICY IF EXISTS "Authenticated users can view active webinars" ON public.webinars;
CREATE POLICY "Authenticated users can view active webinars"
  ON public.webinars FOR SELECT TO authenticated
  USING (is_active = true);

-- SECURITY FIX 2: Create secure profiles view (hide payment IDs)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT 
    id, user_id, name, avatar_url, bio, location, location_city, location_state,
    niche, specialties, experience_level, instagram_url, linkedin_url, website_url,
    social_links, is_public, streak, total_points, 
    subscription_plan, subscription_status, subscription_start_date, subscription_end_date,
    created_at, updated_at
  FROM public.profiles;

-- SECURITY FIX 3: Create secure vendedores view (hide PIX keys)
CREATE OR REPLACE VIEW public.vendedores_public
WITH (security_invoker = on) AS
  SELECT 
    id, nome, slug, status, created_at
  FROM public.vendedores;

-- Fix vendedores SELECT policy: only owner and admins can see full data
DROP POLICY IF EXISTS "Authenticated can read active sellers by slug" ON public.vendedores;
DROP POLICY IF EXISTS "Seller can read own data" ON public.vendedores;

CREATE POLICY "Seller or admin can read seller data"
  ON public.vendedores FOR SELECT TO authenticated
  USING (
    email = (auth.jwt() ->> 'email')::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
