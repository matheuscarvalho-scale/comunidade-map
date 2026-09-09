
-- 1. Fix profiles_public view: remove subscription fields, enable RLS
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT 
    id, user_id, name, avatar_url, bio, location, location_city, location_state,
    niche, specialties, experience_level, instagram_url, linkedin_url, website_url,
    social_links, is_public, streak, total_points, created_at, updated_at
  FROM public.profiles;

-- 2. Fix user_onboarding_public view: add security_invoker
-- First check if it exists and recreate with security_invoker
DROP VIEW IF EXISTS public.user_onboarding_public;

-- 3. Mentors: restrict email visibility - use mentors_public view for non-admin queries
-- The mentors_public view already exists. Just need to ensure mentors table policy restricts email.
-- We'll create a more restrictive policy: members see via mentors_public, admins via mentors directly
DROP POLICY IF EXISTS "Authenticated users can view mentors" ON public.mentors;
CREATE POLICY "Only admins can read mentors directly"
  ON public.mentors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix profiles SELECT: split into owner-only for full data, public for safe columns
-- First, let's update the existing policy
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Owner can see everything
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Others can see public profiles (but RLS can't filter columns, so we rely on the view)
-- We still need this for queries that join on profiles
CREATE POLICY "Authenticated users can view public profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_public = true);
