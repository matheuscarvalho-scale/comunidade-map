CREATE OR REPLACE FUNCTION public.notify_new_formation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _should_notify boolean := false;
  _link text;
BEGIN
  IF COALESCE(NEW.is_published, false) = true AND COALESCE(NEW.is_coming_soon, false) = false THEN
    IF TG_OP = 'INSERT'
       OR COALESCE(OLD.is_published, false) = false
       OR COALESCE(OLD.is_coming_soon, false) = true THEN
      _should_notify := true;
    END IF;
  END IF;

  IF _should_notify THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, 'Nova Formação', 'A formação "' || NEW.title || '" está disponível!', 'new_formation', NEW.id);

    _link := 'https://acelera.mapeducacao.com/formacoes/' || NEW.id::text;
    PERFORM public.notify_new_content_webhook('nova_formacao', NEW.title, NEW.presenter_name, _link);
  END IF;

  RETURN NEW;
END;
$function$;