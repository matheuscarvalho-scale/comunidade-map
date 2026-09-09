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

  -- Confirmação imediata sempre
  INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
  VALUES (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'checkin_confirmation', _now)
  ON CONFLICT ON CONSTRAINT uq_mentoring_reminder_session_user_type DO NOTHING;

  -- Lembretes pré-sessão: só agenda se a janela ainda está no futuro
  INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
  SELECT _session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), r.reminder_type, r.send_at
  FROM (VALUES
    ('48h_before', _session.scheduled_at - INTERVAL '48 hours'),
    ('1d_before',  _session.scheduled_at - INTERVAL '1 day'),
    ('1h_before',  _session.scheduled_at - INTERVAL '1 hour')
  ) AS r(reminder_type, send_at)
  WHERE r.send_at > _now
  ON CONFLICT ON CONSTRAINT uq_mentoring_reminder_session_user_type DO NOTHING;

  -- Pós-sessão só se a sessão ainda não terminou (ou agenda para 1h após)
  IF _session.scheduled_at + INTERVAL '1 hour' > _now THEN
    INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
    VALUES (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'post_session', _session.scheduled_at + INTERVAL '1 hour')
    ON CONFLICT ON CONSTRAINT uq_mentoring_reminder_session_user_type DO NOTHING;
  END IF;

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

-- Limpa lembretes pré-sessão pendentes cuja janela já passou (evita disparos retroativos)
DELETE FROM public.mentoring_email_reminders r
USING public.mentoring_sessions s
WHERE r.session_id = s.id
  AND r.sent = false
  AND r.reminder_type IN ('48h_before','1d_before','1h_before')
  AND (
    (r.reminder_type = '48h_before' AND s.scheduled_at - INTERVAL '48 hours' < now()) OR
    (r.reminder_type = '1d_before'  AND s.scheduled_at - INTERVAL '1 day'    < now()) OR
    (r.reminder_type = '1h_before'  AND s.scheduled_at - INTERVAL '1 hour'   < now())
  );