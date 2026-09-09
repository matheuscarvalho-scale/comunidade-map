
-- =============================================
-- RLS HARDENING: profiles, plan_upgrades, user_roles, community_posts, post_replies
-- =============================================

-- 1. PROFILES: Block DELETE for regular users
CREATE POLICY "Only admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 1b. PROFILES: Admins can view all profiles (for admin pages)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. PLAN_UPGRADES: Service role only for INSERT/UPDATE
-- Block authenticated users from inserting (only edge functions via service_role)
CREATE POLICY "Service role can insert upgrades"
ON public.plan_upgrades FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update upgrades"
ON public.plan_upgrades FOR UPDATE TO service_role
USING (true);

-- Admins can view all upgrades
CREATE POLICY "Admins can view all upgrades"
ON public.plan_upgrades FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. USER_ROLES: Block UPDATE for non-admins (already has admin insert/delete)
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role full access on user_roles
CREATE POLICY "Service role full access on user_roles"
ON public.user_roles FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 4. COMMUNITY_POSTS: Admins can delete any post
CREATE POLICY "Admins can delete any post"
ON public.community_posts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. POST_REPLIES: Fix roles from {public} to {authenticated} for write operations
-- Drop and recreate with correct role
DROP POLICY IF EXISTS "Users can create replies" ON public.post_replies;
CREATE POLICY "Users can create replies"
ON public.post_replies FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own replies" ON public.post_replies;
CREATE POLICY "Users can delete own replies"
ON public.post_replies FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own replies" ON public.post_replies;
CREATE POLICY "Users can update own replies"
ON public.post_replies FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any reply" ON public.post_replies;
CREATE POLICY "Admins can delete any reply"
ON public.post_replies FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
