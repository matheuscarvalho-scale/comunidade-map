
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

  -- No capacity blocking - always allow check-in
  SELECT COUNT(*) INTO _current FROM webinar_checkins WHERE webinar_id = _webinar_id;

  INSERT INTO webinar_checkins (webinar_id, user_id)
  VALUES (_webinar_id, _user_id);

  SELECT au.email INTO _user_email FROM auth.users au WHERE au.id = _user_id;
  SELECT p.name INTO _user_name FROM profiles p WHERE p.user_id = _user_id;

  -- Schedule ALL 4 reminder types
  INSERT INTO webinar_email_reminders (webinar_id, user_id, user_email, user_name, reminder_type, send_at)
  VALUES
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'checkin_confirmation', now()),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1d_before',  _webinar.scheduled_at - INTERVAL '1 day'),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1h_before',  _webinar.scheduled_at - INTERVAL '1 hour'),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '10min_before', _webinar.scheduled_at - INTERVAL '10 minutes');

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
