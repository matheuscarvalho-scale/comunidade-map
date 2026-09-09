
CREATE OR REPLACE FUNCTION public.create_mentoring_post_session_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session mentoring_sessions%ROWTYPE;
  v_email text;
  v_name text;
  v_send_at timestamptz;
BEGIN
  SELECT * INTO v_session FROM mentoring_sessions WHERE id = NEW.session_id;
  IF v_session IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT 
    u.email,
    COALESCE(p.name, u.email)
  INTO v_email, v_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE u.id = NEW.user_id;

  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  v_send_at := v_session.scheduled_at + (COALESCE(v_session.duration_minutes, 60) || ' minutes')::interval;

  INSERT INTO mentoring_email_reminders (session_id, user_id, user_email, user_name, reminder_type, send_at)
  VALUES (NEW.session_id, NEW.user_id, v_email, v_name, 'post_session', v_send_at)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER create_post_session_reminder_on_checkin
  AFTER INSERT ON mentoring_checkins
  FOR EACH ROW
  EXECUTE FUNCTION create_mentoring_post_session_reminder();
