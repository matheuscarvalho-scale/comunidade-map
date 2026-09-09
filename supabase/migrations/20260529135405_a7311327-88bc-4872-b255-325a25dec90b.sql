
CREATE OR REPLACE FUNCTION public.notify_new_content_webhook(_tipo text, _titulo text, _presenter text DEFAULT NULL, _link text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _url text := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-new-content';
  _body jsonb;
BEGIN
  IF _titulo IS NULL OR length(trim(_titulo)) = 0 THEN
    RETURN;
  END IF;

  _body := jsonb_build_object('tipo', _tipo, 'titulo', _titulo, 'source', _tipo);
  IF _presenter IS NOT NULL AND length(trim(_presenter)) > 0 THEN
    _body := _body || jsonb_build_object('presenter', _presenter);
  END IF;
  IF _link IS NOT NULL AND length(trim(_link)) > 0 THEN
    _body := _body || jsonb_build_object('link', _link);
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := _body
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_notify_new_content_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _track RECORD;
  _presenter text;
  _link text;
BEGIN
  SELECT is_active, is_coming_soon, presenter_name, slug, id INTO _track
  FROM public.content_tracks
  WHERE id = NEW.track_id;

  IF COALESCE(_track.is_active, false) = true AND COALESCE(_track.is_coming_soon, false) = false THEN
    _presenter := COALESCE(NULLIF(trim(NEW.presenter_name), ''), NULLIF(trim(NEW.speaker), ''), _track.presenter_name);
    _link := 'https://acelera.mapeducacao.com/trilha-conteudo/' || COALESCE(_track.slug, _track.id::text);
    PERFORM public.notify_new_content_webhook('novo_conteudo', NEW.title, _presenter, _link);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_notify_new_content_track()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _link text;
BEGIN
  _link := 'https://acelera.mapeducacao.com/trilha-conteudo/' || COALESCE(NEW.slug, NEW.id::text);
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_active, false) = true AND COALESCE(NEW.is_coming_soon, false) = false THEN
      PERFORM public.notify_new_content_webhook('nova_trilha', NEW.title, NEW.presenter_name, _link);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.is_active, false) = true
       AND COALESCE(NEW.is_coming_soon, false) = false
       AND (COALESCE(OLD.is_active, false) = false OR COALESCE(OLD.is_coming_soon, false) = true) THEN
      PERFORM public.notify_new_content_webhook('nova_trilha', NEW.title, NEW.presenter_name, _link);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_notify_new_formation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _link text;
BEGIN
  _link := 'https://acelera.mapeducacao.com/formacoes/' || NEW.id::text;
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_published, false) = true AND COALESCE(NEW.is_coming_soon, false) = false THEN
      PERFORM public.notify_new_content_webhook('nova_formacao', NEW.title, NEW.presenter_name, _link);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.is_published, false) = true
       AND COALESCE(NEW.is_coming_soon, false) = false
       AND (COALESCE(OLD.is_published, false) = false OR COALESCE(OLD.is_coming_soon, false) = true) THEN
      PERFORM public.notify_new_content_webhook('nova_formacao', NEW.title, NEW.presenter_name, _link);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
