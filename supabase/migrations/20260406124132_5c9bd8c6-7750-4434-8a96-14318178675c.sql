DROP TRIGGER IF EXISTS trg_notify_new_formation_lesson ON public.formation_lessons;

CREATE OR REPLACE FUNCTION public.notify_new_formation_lesson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _formation RECORD;
BEGIN
  SELECT f.id, f.title, f.is_published, f.is_coming_soon
  INTO _formation
  FROM public.formation_modules fm
  JOIN public.formations f ON f.id = fm.formation_id
  WHERE fm.id = NEW.module_id;

  IF _formation.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF _formation.is_published = true AND COALESCE(_formation.is_coming_soon, false) = false THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (
      NULL,
      'Nova Aula Disponível',
      'A aula "' || NEW.title || '" foi adicionada à formação "' || _formation.title || '"!',
      'new_formation',
      _formation.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_formation_lesson
AFTER INSERT ON public.formation_lessons
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_formation_lesson();