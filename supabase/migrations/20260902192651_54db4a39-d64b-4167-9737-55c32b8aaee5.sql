-- a) SELECT para membros autenticados
CREATE POLICY "Authenticated can view active sessions"
ON public.mentoring_sessions
FOR SELECT
TO authenticated
USING (is_active = true);

-- b) View sem meeting_url e com security_invoker
DROP VIEW IF EXISTS public.mentoring_sessions_public;
CREATE VIEW public.mentoring_sessions_public
WITH (security_invoker = on) AS
SELECT id, title, description, scheduled_at, duration_minutes,
       max_attendees, mentor_id, mentor_name, session_type, is_active, created_at
FROM public.mentoring_sessions;

GRANT SELECT ON public.mentoring_sessions_public TO authenticated;
REVOKE SELECT ON public.mentoring_sessions_public FROM anon;

-- c) RPC com janela de acesso
CREATE OR REPLACE FUNCTION public.get_mentoring_meeting_url(_session_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT meeting_url, scheduled_at, COALESCE(duration_minutes, 60) AS duration_minutes
    INTO s
  FROM public.mentoring_sessions
  WHERE id = _session_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'admin_geral'::app_role) THEN
    RETURN s.meeting_url;
  END IF;

  IF now() >= s.scheduled_at - interval '30 minutes'
     AND now() <= s.scheduled_at + (s.duration_minutes || ' minutes')::interval + interval '30 minutes' THEN
    RETURN s.meeting_url;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_mentoring_meeting_url(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_mentoring_meeting_url(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_mentoring_meeting_url(uuid) TO authenticated, service_role;