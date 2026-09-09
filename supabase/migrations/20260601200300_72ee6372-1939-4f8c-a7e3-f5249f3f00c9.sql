CREATE OR REPLACE FUNCTION public.notify_new_track()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _should_notify boolean := false;
  _link text;
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

    _link := 'https://acelera.mapeducacao.com/trilha-conteudo/' || COALESCE(NULLIF(NEW.slug, ''), NEW.id::text);
    PERFORM public.notify_new_content_webhook('nova_trilha', NEW.title, NEW.presenter_name, _link);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_content_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _track RECORD;
  _link text;
BEGIN
  SELECT id, title, slug, presenter_name, is_active, is_coming_soon INTO _track
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

    _link := 'https://acelera.mapeducacao.com/trilha-conteudo/' || COALESCE(NULLIF(_track.slug, ''), _track.id::text);
    PERFORM public.notify_new_content_webhook('novo_conteudo', NEW.title, COALESCE(NEW.presenter_name, _track.presenter_name), _link);
  END IF;

  RETURN NEW;
END;
$function$;