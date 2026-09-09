DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.profiles;

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=off) AS
SELECT
  id,
  user_id,
  name,
  avatar_url,
  streak,
  total_points,
  created_at,
  updated_at,
  bio,
  specialties,
  location,
  social_links,
  niche,
  location_state,
  location_city,
  experience_level,
  website_url,
  instagram_url,
  linkedin_url,
  is_public,
  job_title,
  company,
  industry
FROM public.profiles
WHERE is_public = true;

GRANT SELECT ON public.profiles_public TO authenticated;