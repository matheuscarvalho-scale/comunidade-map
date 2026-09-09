CREATE OR REPLACE FUNCTION public.notify_new_resource()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES (
    NULL,
    'Novo Recurso Disponível',
    'O recurso "' || NEW.title || '" foi adicionado à biblioteca!',
    'new_resource',
    NEW.id
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_new_resource ON public.resources;
CREATE TRIGGER trg_notify_new_resource
AFTER INSERT ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_resource();