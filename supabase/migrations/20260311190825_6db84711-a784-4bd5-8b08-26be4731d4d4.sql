CREATE OR REPLACE FUNCTION public.notify_new_formation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify when published for the first time
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, 'Nova Formação', 'A formação "' || NEW.title || '" está disponível!', 'new_formation', NEW.id);
  -- Notify when "coming soon" is removed (formation becomes available)
  ELSIF NEW.is_published = true AND NEW.is_coming_soon = false AND OLD IS NOT NULL AND OLD.is_coming_soon = true THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, 'Nova Formação', 'A formação "' || NEW.title || '" está disponível!', 'new_formation', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;