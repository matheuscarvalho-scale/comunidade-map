-- 1. Update validation trigger to accept new reminder types
CREATE OR REPLACE FUNCTION public.validate_reminder_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reminder_type NOT IN ('checkin_confirmation', '1d_before', '1h_before', '10min_before') THEN
    RAISE EXCEPTION 'Invalid reminder_type: %', NEW.reminder_type;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Update webinar_checkin RPC to schedule all 4 reminders
CREATE OR REPLACE FUNCTION public.webinar_checkin(_webinar_id uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _max INTEGER;
  _current INTEGER;
  _webinar RECORD;
  _user_email TEXT;
  _user_name TEXT;
  _spots_remaining INTEGER;
BEGIN
  -- 1. Buscar webinar ativo
  SELECT * INTO _webinar FROM webinars WHERE id = _webinar_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webinar não encontrado ou não está ativo.');
  END IF;

  -- 2. Verificar se webinar já aconteceu
  IF _webinar.scheduled_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este webinar já foi realizado.');
  END IF;

  -- 3. Verificar se já fez check-in
  IF EXISTS (SELECT 1 FROM webinar_checkins WHERE webinar_id = _webinar_id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já fez check-in neste webinar.');
  END IF;

  -- 4. Contar check-ins atuais
  SELECT COUNT(*) INTO _current FROM webinar_checkins WHERE webinar_id = _webinar_id;

  -- 5. Verificar limite de vagas
  IF _webinar.max_attendees IS NOT NULL AND _current >= _webinar.max_attendees THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webinar lotado! Todas as vagas foram preenchidas.');
  END IF;

  -- 6. Buscar dados do usuário para email
  SELECT p.name INTO _user_name FROM profiles p WHERE p.user_id = _user_id;
  SELECT u.email INTO _user_email FROM auth.users u WHERE u.id = _user_id;

  -- 7. Criar check-in
  INSERT INTO webinar_checkins (webinar_id, user_id, email_sent) VALUES (_webinar_id, _user_id, false);

  -- 8. Agendar lembrete de confirmação imediata (será processado no próximo ciclo do cron)
  INSERT INTO webinar_email_reminders (webinar_id, user_id, user_email, user_name, reminder_type, send_at)
  VALUES (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'checkin_confirmation', now());

  -- 9. Agendar lembrete de 1 dia antes
  IF _webinar.scheduled_at - INTERVAL '1 day' > now() THEN
    INSERT INTO webinar_email_reminders (webinar_id, user_id, user_email, user_name, reminder_type, send_at)
    VALUES (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1d_before', _webinar.scheduled_at - INTERVAL '1 day');
  END IF;

  -- 10. Agendar lembrete de 1 hora antes
  IF _webinar.scheduled_at - INTERVAL '1 hour' > now() THEN
    INSERT INTO webinar_email_reminders (webinar_id, user_id, user_email, user_name, reminder_type, send_at)
    VALUES (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1h_before', _webinar.scheduled_at - INTERVAL '1 hour');
  END IF;

  -- 11. Agendar lembrete de 10 minutos antes
  IF _webinar.scheduled_at - INTERVAL '10 minutes' > now() THEN
    INSERT INTO webinar_email_reminders (webinar_id, user_id, user_email, user_name, reminder_type, send_at)
    VALUES (_webinar_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '10min_before', _webinar.scheduled_at - INTERVAL '10 minutes');
  END IF;

  -- 12. Calcular vagas restantes
  IF _webinar.max_attendees IS NOT NULL THEN
    _spots_remaining := _webinar.max_attendees - _current - 1;
  ELSE
    _spots_remaining := NULL;
  END IF;

  -- 13. Retornar dados
  RETURN jsonb_build_object(
    'success', true,
    'user_email', _user_email,
    'user_name', COALESCE(_user_name, 'Membro MAP'),
    'webinar_title', _webinar.title,
    'webinar_description', _webinar.description,
    'partner_name', _webinar.partner_name,
    'scheduled_at', _webinar.scheduled_at,
    'duration_minutes', _webinar.duration_minutes,
    'meeting_url', COALESCE(_webinar.meeting_url, ''),
    'spots_remaining', _spots_remaining,
    'total_spots', _webinar.max_attendees
  );
END;
$function$;