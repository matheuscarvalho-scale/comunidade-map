
-- FIX #2: Tighten profiles public policy to require authentication
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view public profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((is_public = true) OR (auth.uid() = user_id));

-- FIX #3: Recreate mentors_public view WITHOUT email column
DROP VIEW IF EXISTS public.mentors_public;
CREATE VIEW public.mentors_public
WITH (security_invoker = on) AS
  SELECT id, created_at, name, specialty, bio, avatar_url
  FROM public.mentors;
-- Email is excluded from the public view
