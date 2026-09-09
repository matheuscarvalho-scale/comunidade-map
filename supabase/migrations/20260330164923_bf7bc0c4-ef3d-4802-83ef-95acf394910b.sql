
-- Drop the overly restrictive read-only policy
DROP POLICY IF EXISTS "Only admins can read mentors directly" ON public.mentors;

-- Allow all authenticated users to read mentors (public info like name, bio, avatar)
CREATE POLICY "Authenticated users can read mentors"
  ON public.mentors
  FOR SELECT
  TO authenticated
  USING (true);
