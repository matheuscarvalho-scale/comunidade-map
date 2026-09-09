
-- ============================================================
-- 1. Update webinar_checkin RPC to add checkin_confirmation + 1d_before
-- ============================================================
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
BEGIN
  SELECT * INTO _webinar FROM webinars WHERE id = _webinar_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webinar não encontrado');
  END IF;

  SELECT COUNT(*) INTO _current FROM webinar_checkins WHERE webinar_id = _webinar_id;
  
  IF _webinar.max_attendees IS NOT NULL AND _current >= _webinar.max_attendees THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webinar lotado! Todas as vagas foram preenchidas.');
  END IF;

  IF EXISTS (SELECT 1 FROM webinar_checkins WHERE webinar_id = _webinar_id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já fez check-in neste webinar.');
  END IF;

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
    'spots_remaining', CASE 
      WHEN _webinar.max_attendees IS NOT NULL 
      THEN _webinar.max_attendees - _current - 1 
      ELSE NULL 
    END
  );
END;
$function$;

-- ============================================================
-- 2. Create mentoring_email_reminders table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentoring_email_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.mentoring_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text,
  reminder_type text NOT NULL,
  send_at timestamptz NOT NULL,
  sent boolean DEFAULT false,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mentoring_email_reminders ENABLE ROW LEVEL SECURITY;

-- Service role manages everything (edge functions use service role)
CREATE POLICY "Service role can manage mentoring reminders"
  ON public.mentoring_email_reminders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Validate reminder type trigger
CREATE OR REPLACE FUNCTION public.validate_mentoring_reminder_type()
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

DROP TRIGGER IF EXISTS validate_mentoring_reminder_type_trigger ON public.mentoring_email_reminders;
CREATE TRIGGER validate_mentoring_reminder_type_trigger
  BEFORE INSERT ON public.mentoring_email_reminders
  FOR EACH ROW EXECUTE FUNCTION public.validate_mentoring_reminder_type();

-- Cascade delete reminders when a mentoring checkin is cancelled
CREATE OR REPLACE FUNCTION public.delete_mentoring_reminders_cascade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.mentoring_email_reminders
  WHERE session_id = OLD.session_id
    AND user_id = OLD.user_id
    AND sent = false;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS delete_mentoring_reminders_on_checkin_delete ON public.mentoring_checkins;
CREATE TRIGGER delete_mentoring_reminders_on_checkin_delete
  AFTER DELETE ON public.mentoring_checkins
  FOR EACH ROW EXECUTE FUNCTION public.delete_mentoring_reminders_cascade();

-- ============================================================
-- 3. Create mentoring_checkin RPC
-- ============================================================
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

  -- Schedule ALL 4 reminder types
  INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
  VALUES
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), 'checkin_confirmation', now()),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1d_before',  _session.scheduled_at - INTERVAL '1 day'),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '1h_before',  _session.scheduled_at - INTERVAL '1 hour'),
    (_session_id, _user_id, _user_email, COALESCE(_user_name, 'Membro MAP'), '10min_before', _session.scheduled_at - INTERVAL '10 minutes');

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
