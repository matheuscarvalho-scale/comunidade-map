-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS delete_webinar_reminders_on_checkin_cancel ON public.webinar_checkins;
DROP FUNCTION IF EXISTS delete_webinar_reminders_cascade();

-- Create function to delete reminders when check-in is cancelled
CREATE OR REPLACE FUNCTION public.delete_webinar_reminders_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all pending reminders for this user and webinar
  DELETE FROM public.webinar_email_reminders
  WHERE webinar_id = OLD.webinar_id 
    AND user_id = OLD.user_id 
    AND sent = false;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger to automatically delete reminders on check-in cancellation
CREATE TRIGGER delete_webinar_reminders_on_checkin_cancel
BEFORE DELETE ON public.webinar_checkins
FOR EACH ROW
EXECUTE FUNCTION delete_webinar_reminders_cascade();