CREATE OR REPLACE FUNCTION public.notify_new_track()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _should_notify boolean := false;
BEGIN
  IF NEW.is_active = true AND COALESCE(NEW.is_coming_soon, false) = false THEN
    IF TG_OP = 'INSERT'
       OR COALESCE(OLD.is_active, false) = false
       OR COALESCE(OLD.is_coming_soon, false) = true THEN
      _should_notify := true;
    END IF;
  END IF;

  IF _should_notify THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, '🎯 Nova Trilha de Conteúdo', 'A trilha "' || NEW.title || '" está disponível!', 'new_track', NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;