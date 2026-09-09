DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  name,
  bio,
  avatar_url,
  company,
  job_title,
  industry,
  niche,
  experience_level,
  location,
  location_city,
  location_state,
  specialties,
  linkedin_url,
  instagram_url,
  website_url,
  social_links,
  is_public,
  total_points,
  streak,
  created_at
FROM public.profiles
WHERE is_public = true;

GRANT SELECT ON public.profiles_public TO authenticated, anon;