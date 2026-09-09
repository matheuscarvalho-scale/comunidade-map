CREATE TABLE webinar_email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  reminder_type TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_reminder_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reminder_type NOT IN ('checkin_confirmation', '1h_before', '10min_before') THEN
    RAISE EXCEPTION 'Invalid reminder_type: %', NEW.reminder_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_reminder_type
BEFORE INSERT OR UPDATE ON webinar_email_reminders
FOR EACH ROW EXECUTE FUNCTION public.validate_reminder_type();

CREATE INDEX idx_reminders_pending ON webinar_email_reminders(sent, send_at) WHERE sent = false;
CREATE INDEX idx_reminders_webinar ON webinar_email_reminders(webinar_id);
CREATE INDEX idx_reminders_user ON webinar_email_reminders(user_id);

ALTER TABLE webinar_email_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reminders"
ON webinar_email_reminders FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Users can view own reminders"
ON webinar_email_reminders FOR SELECT
TO authenticated
USING (user_id = auth.uid());