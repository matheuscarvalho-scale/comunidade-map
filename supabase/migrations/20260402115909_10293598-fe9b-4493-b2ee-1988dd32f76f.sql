
-- 1. Update validation trigger for mentoring reminders
CREATE OR REPLACE FUNCTION public.validate_mentoring_reminder_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reminder_type NOT IN ('checkin_confirmation', '1d_before', '1h_before', '10min_before', 'post_session') THEN
    RAISE EXCEPTION 'Invalid reminder_type: %', NEW.reminder_type;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Update validation trigger for webinar reminders
CREATE OR REPLACE FUNCTION public.validate_reminder_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reminder_type NOT IN ('checkin_confirmation', '1d_before', '1h_before', '10min_before', 'post_session') THEN
    RAISE EXCEPTION 'Invalid reminder_type: %', NEW.reminder_type;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Update mentoring_checkin to add post_session reminder (1h after session starts)
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

  -- Schedule ALL 5 reminder types (including post-session feedback)
  INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
  VALUES
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'checkin_confirmation', now()),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1d_before',  _session.scheduled_at - INTERVAL '1 day'),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1h_before',  _session.scheduled_at - INTERVAL '1 hour'),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '10min_before', _session.scheduled_at - INTERVAL '10 minutes'),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'post_session', _session.scheduled_at + INTERVAL '1 hour');

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

-- 4. Update webinar_checkin to add post_session reminder (1h after webinar starts)
CREATE OR REPLACE FUNCTION public.webinar_checkin(_webinar_id uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current INTEGER;
  _webinar RECORD;
  _user_email TEXT;
  _user_name TEXT;
BEGIN
  SELECT * INTO _webinar FROM webinars WHERE id = _webinar_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webinar não encontrado');
  END IF;

  IF EXISTS (SELECT 1 FROM webinar_checkins WHERE webinar_id = _webinar_id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já fez check-in neste webinar.');
  END IF;

  SELECT COUNT(*) INTO _current FROM webinar_checkins WHERE webinar_id = _webinar_id;

  INSERT INTO webinar_checkins (webinar_id, user_id)
  VALUES (_webinar_id, _user_id);

  SELECT au.email INTO _user_email FROM auth.users au WHERE au.id = _user_id;
  SELECT p.name INTO _user_name FROM profiles p WHERE p.user_id = _user_id;

  -- Schedule ALL 5 reminder types (including post-session feedback)
  INSERT INTO webinar_email_reminders (webinar_id, user_id, user_email, user_name, reminder_type, send_at)
  VALUES
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'checkin_confirmation', now()),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1d_before',  _webinar.scheduled_at - INTERVAL '1 day'),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1h_before',  _webinar.scheduled_at - INTERVAL '1 hour'),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '10min_before', _webinar.scheduled_at - INTERVAL '10 minutes'),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'post_session', _webinar.scheduled_at + INTERVAL '1 hour');

  RETURN jsonb_build_object(
    'success', true,
    'user_email', _user_email,
    'user_name', COALESCE(_user_name, 'Membro MAP'),
    'webinar_title', _webinar.title,
    'scheduled_at', _webinar.scheduled_at,
    'meeting_url', _webinar.meeting_url,
    'spots_remaining', NULL
  );
END;
$function$;
