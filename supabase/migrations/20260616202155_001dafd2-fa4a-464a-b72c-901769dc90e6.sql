CREATE OR REPLACE FUNCTION public.validate_mentoring_reminder_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reminder_type NOT IN ('checkin_confirmation', '1d_before', '1h_before', '48h_before', 'post_session') THEN
    RAISE EXCEPTION 'Invalid reminder_type: %', NEW.reminder_type;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mentoring_checkin(_session_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _session RECORD;
  _user_email TEXT;
  _user_name TEXT;
  _current INTEGER;
BEGIN
  SELECT * INTO _session FROM mentoring_sessions WHERE id = _session_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sessão não encontrada');
  END IF;

  IF EXISTS (SELECT 1 FROM mentoring_checkins WHERE session_id = _session_id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já fez check-in nesta sessão.');
  END IF;

  IF _session.max_attendees IS NOT NULL THEN
    SELECT COUNT(*) INTO _current FROM mentoring_checkins WHERE session_id = _session_id;
    IF _current >= _session.max_attendees THEN
      RETURN jsonb_build_object('success', false, 'error', 'Sessão lotada! Todas as vagas foram preenchidas.');
    END IF;
  END IF;

  INSERT INTO mentoring_checkins (session_id, user_id)
  VALUES (_session_id, _user_id);

  SELECT au.email INTO _user_email FROM auth.users au WHERE au.id = _user_id;
  SELECT p.name INTO _user_name FROM profiles p WHERE p.user_id = _user_id;

  INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
  VALUES
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'checkin_confirmation', now()),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '48h_before', _session.scheduled_at - INTERVAL '48 hours'),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1d_before',  _session.scheduled_at - INTERVAL '1 day'),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1h_before',  _session.scheduled_at - INTERVAL '1 hour'),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'post_session', _session.scheduled_at + INTERVAL '1 hour')
  ON CONFLICT ON CONSTRAINT uq_mentoring_reminder_session_user_type DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'user_email', _user_email,
    'user_name', COALESCE(_user_name, 'Membro MAP'),
    'session_title', _session.title,
    'scheduled_at', _session.scheduled_at,
    'meeting_url', _session.meeting_url
  );
END;
$function$;

DELETE FROM public.mentoring_email_reminders
WHERE reminder_type = '10min_before' AND sent = false;

INSERT INTO public.mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
SELECT
  mc.session_id,
  mc.user_id,
  au.email,
  COALESCE(p.name, 'Membro MAP'),
  '48h_before',
  ms.scheduled_at - INTERVAL '48 hours'
FROM public.mentoring_checkins mc
JOIN public.mentoring_sessions ms ON ms.id = mc.session_id
JOIN auth.users au ON au.id = mc.user_id
LEFT JOIN public.profiles p ON p.user_id = mc.user_id
WHERE ms.scheduled_at - INTERVAL '48 hours' > now()
ON CONFLICT ON CONSTRAINT uq_mentoring_reminder_session_user_type DO NOTHING;