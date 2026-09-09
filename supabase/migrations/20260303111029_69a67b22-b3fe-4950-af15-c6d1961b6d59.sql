
CREATE OR REPLACE FUNCTION public.notify_new_formation_lesson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _formation RECORD;
  _user RECORD;
BEGIN
  SELECT f.id, f.title, f.is_published INTO _formation
  FROM public.formation_modules fm
  JOIN public.formations f ON fm.formation_id = f.id
  WHERE fm.id = NEW.module_id;

  IF _formation.is_published = true THEN
    -- Notify only users who have progress in this formation
    FOR _user IN
      SELECT DISTINCT flp.user_id
      FROM public.formation_lesson_progress flp
      JOIN public.formation_lessons fl ON flp.lesson_id = fl.id
      JOIN public.formation_modules fm ON fl.module_id = fm.id
      WHERE fm.formation_id = _formation.id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        _user.user_id,
        'Nova Aula Disponível',
        'A aula "' || NEW.title || '" foi adicionada à formação "' || _formation.title || '"!',
        'new_formation',
        _formation.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
