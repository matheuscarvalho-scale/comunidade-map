-- Drop possibly pre-existing public views so we can recreate cleanly
DROP VIEW IF EXISTS public.mentors_public CASCADE;
DROP VIEW IF EXISTS public.mentoring_sessions_public CASCADE;

-- Remove the broad SELECT policies that exposed email columns to all
-- authenticated users. Admin ALL policies remain in place for full admin access.
DROP POLICY IF EXISTS "Authenticated users can read mentors" ON public.mentors;
DROP POLICY IF EXISTS "Authenticated users can view active sessions" ON public.mentoring_sessions;
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON public.mentoring_sessions;

-- Create SECURITY DEFINER views (owned by postgres) so they bypass RLS on the
-- base tables and only expose non-sensitive columns to authenticated users.
CREATE VIEW public.mentors_public AS
SELECT id, user_id, name, avatar_url, specialty, bio, created_at
FROM public.mentors;

CREATE VIEW public.mentoring_sessions_public AS
SELECT
  id, title, description, scheduled_at, duration_minutes,
  meeting_url, max_attendees, mentor_id, mentor_name,
  session_type, is_active, created_at
FROM public.mentoring_sessions;

GRANT SELECT ON public.mentors_public TO authenticated;
GRANT SELECT ON public.mentoring_sessions_public TO authenticated;