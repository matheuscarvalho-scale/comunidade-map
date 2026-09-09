-- Notificação in-app de novo content_item: só se trilha pai estiver ativa E não em breve
CREATE OR REPLACE FUNCTION public.notify_new_content_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _track RECORD;
BEGIN
  SELECT id, title, is_active, is_coming_soon INTO _track
  FROM public.content_tracks
  WHERE id = NEW.track_id;

  IF _track.is_active = true AND COALESCE(_track.is_coming_soon, false) = false THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (
      NULL,
      'Novo Conteúdo Disponível',
      'O conteúdo "' || NEW.title || '" foi adicionado à trilha "' || _track.title || '"!',
      'new_track',
      _track.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Notificação in-app de nova formação: só se publicada E não em breve
CREATE OR REPLACE FUNCTION public.notify_new_formation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.is_published, false) = true AND COALESCE(NEW.is_coming_soon, false) = false THEN
    IF TG_OP = 'INSERT'
       OR COALESCE(OLD.is_published, false) = false
       OR COALESCE(OLD.is_coming_soon, false) = true THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (NULL, 'Nova Formação', 'A formação "' || NEW.title || '" está disponível!', 'new_formation', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Webhook Make de novo content_item: só se trilha pai estiver ativa E não em breve
CREATE OR REPLACE FUNCTION public.trg_notify_new_content_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _track RECORD;
BEGIN
  SELECT is_active, is_coming_soon INTO _track
  FROM public.content_tracks
  WHERE id = NEW.track_id;

  IF COALESCE(_track.is_active, false) = true AND COALESCE(_track.is_coming_soon, false) = false THEN
    PERFORM public.notify_new_content_webhook('novo_conteudo', NEW.title);
  END IF;
  RETURN NEW;
END;
$function$;