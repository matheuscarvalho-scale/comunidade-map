
-- 1. Notify user when they complete a formation (all lessons done)
CREATE OR REPLACE FUNCTION public.notify_formation_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _formation_id UUID;
  _formation_title TEXT;
  _total_lessons INTEGER;
  _completed_lessons INTEGER;
BEGIN
  -- Only when marking as completed
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    -- Get formation info from the lesson
    SELECT fm.formation_id, f.title INTO _formation_id, _formation_title
    FROM public.formation_lessons fl
    JOIN public.formation_modules fm ON fl.module_id = fm.id
    JOIN public.formations f ON fm.formation_id = f.id
    WHERE fl.id = NEW.lesson_id;

    IF _formation_id IS NOT NULL THEN
      -- Count total lessons in formation
      SELECT COUNT(*) INTO _total_lessons
      FROM public.formation_lessons fl
      JOIN public.formation_modules fm ON fl.module_id = fm.id
      WHERE fm.formation_id = _formation_id;

      -- Count completed lessons by this user
      SELECT COUNT(*) INTO _completed_lessons
      FROM public.formation_lesson_progress flp
      JOIN public.formation_lessons fl ON flp.lesson_id = fl.id
      JOIN public.formation_modules fm ON fl.module_id = fm.id
      WHERE fm.formation_id = _formation_id
        AND flp.user_id = NEW.user_id
        AND flp.completed = true;

      -- If all lessons are completed, notify
      IF _completed_lessons >= _total_lessons THEN
        INSERT INTO public.notifications (user_id, title, message, type, reference_id)
        VALUES (
          NEW.user_id,
          'Formação Concluída! 🎓',
          'Parabéns! Você concluiu a formação "' || _formation_title || '"!',
          'new_formation',
          _formation_id
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_formation_completion
AFTER INSERT OR UPDATE ON public.formation_lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.notify_formation_completion();

-- 2. Notify user when they unlock an achievement/badge
CREATE OR REPLACE FUNCTION public.notify_achievement_unlock_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _achievement RECORD;
BEGIN
  IF NEW.unlocked_at IS NOT NULL AND (OLD IS NULL OR OLD.unlocked_at IS NULL) THEN
    SELECT name, icon, points INTO _achievement FROM public.achievements WHERE id = NEW.achievement_id;
    IF FOUND THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        NEW.user_id,
        'Conquista Desbloqueada! ' || _achievement.icon,
        'Você desbloqueou "' || _achievement.name || '"! +' || COALESCE(_achievement.points, 0) || ' pontos',
        'achievement',
        NEW.achievement_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_achievement_unlock_notification
AFTER INSERT OR UPDATE ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.notify_achievement_unlock_notification();

-- 3. Notify all users when a new lesson is added to a published formation
CREATE OR REPLACE FUNCTION public.notify_new_formation_lesson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _formation RECORD;
BEGIN
  SELECT f.id, f.title, f.is_published INTO _formation
  FROM public.formation_modules fm
  JOIN public.formations f ON fm.formation_id = f.id
  WHERE fm.id = NEW.module_id;

  IF _formation.is_published = true THEN
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
FOR EACH ROW EXECUTE FUNCTION public.notify_new_formation_lesson();

-- 4. Notify all users when a new content item is added to an active track
CREATE OR REPLACE FUNCTION public.notify_new_content_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _track RECORD;
BEGIN
  SELECT id, title, is_active INTO _track
  FROM public.content_tracks
  WHERE id = NEW.track_id;

  IF _track.is_active = true THEN
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
$$;

CREATE TRIGGER trg_notify_new_content_item
AFTER INSERT ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.notify_new_content_item();
