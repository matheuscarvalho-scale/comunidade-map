
-- Trigger: notify user 1h before mentoring (when reminder row is created with type '1h_before')
CREATE OR REPLACE FUNCTION public.notify_mentoring_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session RECORD;
BEGIN
  -- Only create notification for 1h_before reminders
  IF NEW.reminder_type = '1h_before' THEN
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
$$;

CREATE TRIGGER trg_notify_mentoring_reminder
AFTER INSERT ON public.mentoring_email_reminders
FOR EACH ROW EXECUTE FUNCTION public.notify_mentoring_reminder();

-- Same for webinar reminders
CREATE OR REPLACE FUNCTION public.notify_webinar_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _webinar RECORD;
BEGIN
  IF NEW.reminder_type = '1h_before' THEN
    SELECT title, scheduled_at INTO _webinar FROM public.webinars WHERE id = NEW.webinar_id;
    IF FOUND THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        NEW.user_id,
        'Webinar em 1 hora',
        'O webinar "' || _webinar.title || '" começa em 1 hora!',
        'new_webinar',
        NEW.webinar_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_webinar_reminder
AFTER INSERT ON public.webinar_email_reminders
FOR EACH ROW EXECUTE FUNCTION public.notify_webinar_reminder();
