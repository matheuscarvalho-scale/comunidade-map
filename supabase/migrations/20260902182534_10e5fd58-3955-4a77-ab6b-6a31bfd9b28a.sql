-- ITEM 1: check-in requires the caller to be the authenticated user; no e-mail in response
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
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autorizado');
  END IF;

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

  INSERT INTO webinar_email_reminders (webinar_id, user_id, user_email, user_name, reminder_type, send_at, sent, sent_at)
  VALUES (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'checkin_confirmation', now(), true, now());

  INSERT INTO webinar_email_reminders (webinar_id, user_id, user_email, user_name, reminder_type, send_at)
  VALUES
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1d_before',  _webinar.scheduled_at - INTERVAL '1 day'),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1h_before',  _webinar.scheduled_at - INTERVAL '1 hour'),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '10min_before', _webinar.scheduled_at - INTERVAL '10 minutes'),
    (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'post_session', _webinar.scheduled_at + INTERVAL '1 hour');

  RETURN jsonb_build_object(
    'success', true,
    'user_name', COALESCE(_user_name, 'Membro MAP'),
    'webinar_title', _webinar.title,
    'scheduled_at', _webinar.scheduled_at,
    'meeting_url', _webinar.meeting_url,
    'spots_remaining', NULL
  );
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
  _now TIMESTAMPTZ := now();
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autorizado');
  END IF;

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

  INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at, sent, sent_at)
  VALUES (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'checkin_confirmation', _now, true, _now)
  ON CONFLICT ON CONSTRAINT uq_mentoring_reminder_session_user_type DO NOTHING;

  INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
  SELECT _session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), r.reminder_type, r.send_at
  FROM (VALUES
    ('48h_before', _session.scheduled_at - INTERVAL '48 hours'),
    ('1d_before',  _session.scheduled_at - INTERVAL '1 day'),
    ('1h_before',  _session.scheduled_at - INTERVAL '1 hour')
  ) AS r(reminder_type, send_at)
  WHERE r.send_at > _now
  ON CONFLICT ON CONSTRAINT uq_mentoring_reminder_session_user_type DO NOTHING;

  IF _session.scheduled_at + INTERVAL '1 hour' > _now THEN
    INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
    VALUES (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'post_session', _session.scheduled_at + INTERVAL '1 hour')
    ON CONFLICT ON CONSTRAINT uq_mentoring_reminder_session_user_type DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_name', COALESCE(_user_name, 'Membro MAP'),
    'session_title', _session.title,
    'scheduled_at', _session.scheduled_at,
    'meeting_url', _session.meeting_url
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.webinar_checkin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.webinar_checkin(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.mentoring_checkin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentoring_checkin(uuid, uuid) TO authenticated, service_role;

-- ITEM 3a: content materials/mentors readable only by logged-in members
DROP POLICY IF EXISTS "Anyone can view content item materials" ON public.content_item_materials;
CREATE POLICY "Anyone can view content item materials"
ON public.content_item_materials FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view content item mentors" ON public.content_item_mentors;
CREATE POLICY "Anyone can view content item mentors"
ON public.content_item_mentors FOR SELECT TO authenticated USING (true);

-- ITEM 4: no anonymous read on these
REVOKE SELECT ON public.profiles_public FROM anon;
REVOKE SELECT ON public.mentors_public FROM anon;
REVOKE SELECT ON public.member_analytics FROM anon;

-- ITEM 5 + 6: functions not callable by anonymous visitors
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_with_achievements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_with_achievements() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_content_track_completion_rates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_content_track_completion_rates() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_content_item_completion_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_content_item_completion_stats(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_primary_user_id_for_secondary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_primary_user_id_for_secondary(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_highest_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_highest_role(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.notify_new_content_webhook(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_new_content_webhook(text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.notify_new_content_webhook(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_new_content_webhook(text, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.notify_new_content_webhook(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_new_content_webhook(text, text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.ensure_weekly_thursday_mentorings(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_thursday_mentorings(integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_contact_cadence(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_contact_cadence(timestamptz, timestamptz) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_reports_cac(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reports_cac(timestamptz, timestamptz) TO authenticated, service_role;