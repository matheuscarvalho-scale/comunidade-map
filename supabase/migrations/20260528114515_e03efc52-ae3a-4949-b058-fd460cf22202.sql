-- Revoke column-level SELECT on sensitive email fields from regular roles.
-- Admin write operations (INSERT/UPDATE) remain unaffected because column
-- privileges for INSERT/UPDATE are granted separately and we are not touching them.
-- Service role (used by edge functions) bypasses these grants.

REVOKE SELECT (email) ON public.mentors FROM authenticated, anon;
REVOKE SELECT (mentor_email, cohost_email) ON public.mentoring_sessions FROM authenticated, anon;