
CREATE OR REPLACE FUNCTION public.notify_resource_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when is_active changes from false to true
  IF OLD.is_active = false AND NEW.is_active = true THEN
    INSERT INTO notifications (user_id, title, message, type, reference_id)
    VALUES (
      NULL,
      '📦 Novo Recurso Disponível',
      'O recurso "' || NEW.title || '" já está disponível na biblioteca de recursos!',
      'recurso',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_resource_activated
  AFTER UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION notify_resource_activated();
