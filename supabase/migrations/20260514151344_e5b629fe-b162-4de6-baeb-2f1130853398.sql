DROP POLICY IF EXISTS "Authenticated users can view sessions" ON public.mentoring_sessions;

CREATE POLICY "Authenticated users can view sessions"
ON public.mentoring_sessions
FOR SELECT
TO authenticated
USING (true);