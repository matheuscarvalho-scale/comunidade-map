-- Função que chama a edge function notify-make-new-content via pg_net
CREATE OR REPLACE FUNCTION public.notify_new_content_webhook(_tipo text, _titulo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-new-content';
BEGIN
  IF _titulo IS NULL OR length(trim(_titulo)) = 0 THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('tipo', _tipo, 'titulo', _titulo, 'source', _tipo)
  );
END;
$$;

-- Trigger: nova formação publicada (INSERT publicada ou UPDATE que vira publicada)
CREATE OR REPLACE FUNCTION public.trg_notify_new_formation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_published, false) = true AND COALESCE(NEW.is_coming_soon, false) = false THEN
      PERFORM public.notify_new_content_webhook('nova_formacao', NEW.title);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.is_published, false) = true
       AND COALESCE(NEW.is_coming_soon, false) = false
       AND (COALESCE(OLD.is_published, false) = false OR COALESCE(OLD.is_coming_soon, false) = true) THEN
      PERFORM public.notify_new_content_webhook('nova_formacao', NEW.title);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_formation ON public.formations;
CREATE TRIGGER notify_new_formation
AFTER INSERT OR UPDATE ON public.formations
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_formation();

-- Trigger: nova trilha de conteúdo ativa
CREATE OR REPLACE FUNCTION public.trg_notify_new_content_track()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_active, false) = true AND COALESCE(NEW.is_coming_soon, false) = false THEN
      PERFORM public.notify_new_content_webhook('nova_trilha', NEW.title);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.is_active, false) = true
       AND COALESCE(NEW.is_coming_soon, false) = false
       AND (COALESCE(OLD.is_active, false) = false OR COALESCE(OLD.is_coming_soon, false) = true) THEN
      PERFORM public.notify_new_content_webhook('nova_trilha', NEW.title);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_content_track ON public.content_tracks;
CREATE TRIGGER notify_new_content_track
AFTER INSERT OR UPDATE ON public.content_tracks
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_content_track();

-- Trigger: novo content_item (vídeo/conteúdo dentro da trilha)
CREATE OR REPLACE FUNCTION public.trg_notify_new_content_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_new_content_webhook('novo_conteudo', NEW.title);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_content_item ON public.content_items;
CREATE TRIGGER notify_new_content_item
AFTER INSERT ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_content_item();