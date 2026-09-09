
CREATE OR REPLACE FUNCTION public.notify_mentoring_reminder()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _session RECORD;
BEGIN
  -- Only create notification for 1h_before reminders AND only when send_at has actually passed
  IF NEW.reminder_type = '1h_before' AND NEW.send_at <= now() THEN
    SELECT title, scheduled_at INTO _session FROM public.mentoring_sessions WHERE id = NEW.session_id;
    IF FOUND THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        NEW.user_id,
        'Mentoria em 1 hora',
        'A sessão "' || _session.title || '" começa em 1 hora!',
        'new_mentoring',
        NEW.session_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
