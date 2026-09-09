
CREATE OR REPLACE FUNCTION public.check_streak_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_streak INTEGER;
  v_achievement_id UUID;
BEGIN
  v_streak := COALESCE(NEW.streak, 0);

  IF OLD.streak IS NOT DISTINCT FROM NEW.streak THEN
    RETURN NEW;
  END IF;

  -- Streak de 7 Dias
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Streak de 7 Dias';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, v_achievement_id, v_streak)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = EXCLUDED.progress;
    IF v_streak >= 7 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  -- Streak de 30 Dias
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Streak de 30 Dias';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, v_achievement_id, v_streak)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = EXCLUDED.progress;
    IF v_streak >= 30 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  -- Membro Veterano: 365 dias de streak
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Membro Veterano';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, v_achievement_id, v_streak)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = EXCLUDED.progress;
    IF v_streak >= 365 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
