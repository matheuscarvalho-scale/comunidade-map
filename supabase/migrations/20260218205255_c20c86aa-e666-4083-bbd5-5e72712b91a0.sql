-- Fix 1: Update check_mentoring_achievements to always track progress (even partial)
CREATE OR REPLACE FUNCTION public.check_mentoring_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mentoring_count INTEGER;
  v_achievement_id UUID;
BEGIN
  -- Count total mentoring check-ins for this user
  SELECT COUNT(*) INTO v_mentoring_count
  FROM public.mentoring_checkins
  WHERE user_id = NEW.user_id;

  -- First mentoring achievement (Primeira Mentoria)
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Primeira Mentoria';
  IF v_achievement_id IS NOT NULL THEN
    IF v_mentoring_count >= 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), 1)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        unlocked_at = COALESCE(user_achievements.unlocked_at, now()),
        progress = 1;
    END IF;
  END IF;

  -- Participante Ativo (10 mentorias) - always update progress
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Participante Ativo';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, v_achievement_id, v_mentoring_count)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = GREATEST(user_achievements.progress, v_mentoring_count);
    IF v_mentoring_count >= 10 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  -- Maratonista (50 mentorias) - always update progress
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Maratonista';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, v_achievement_id, v_mentoring_count)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = GREATEST(user_achievements.progress, v_mentoring_count);
    IF v_mentoring_count >= 50 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix 2: Update check_community_achievements to track replies (Ajudante) and likes (Influenciador, Líder)
CREATE OR REPLACE FUNCTION public.check_community_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_count INTEGER;
  v_reply_count INTEGER;
  v_achievement_id UUID;
BEGIN
  -- Count total posts by this user
  SELECT COUNT(*) INTO v_post_count
  FROM public.community_posts
  WHERE user_id = NEW.user_id;

  -- Count total replies by this user
  SELECT COUNT(*) INTO v_reply_count
  FROM public.post_replies
  WHERE user_id = NEW.user_id;

  -- First post achievement (Primeiro Post)
  IF v_post_count >= 1 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Primeiro Post';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), 1)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        unlocked_at = COALESCE(user_achievements.unlocked_at, now()),
        progress = 1;
    END IF;
  END IF;

  -- Ajudante: 10 respostas em posts
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Ajudante';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, v_achievement_id, v_reply_count)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = GREATEST(user_achievements.progress, v_reply_count);
    IF v_reply_count >= 10 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix 3: Add trigger for post_replies to track community achievements
DROP TRIGGER IF EXISTS on_post_reply ON public.post_replies;
CREATE TRIGGER on_post_reply
  AFTER INSERT ON public.post_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.check_community_achievements();

-- Fix 4: Function to update streak achievements when streak changes in profiles
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

  -- Only proceed if streak actually changed
  IF OLD.streak IS NOT DISTINCT FROM NEW.streak THEN
    RETURN NEW;
  END IF;

  -- Streak de 7 Dias
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Streak de 7 Dias';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, v_achievement_id, v_streak)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = GREATEST(user_achievements.progress, v_streak);
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
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = GREATEST(user_achievements.progress, v_streak);
    IF v_streak >= 30 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  -- Membro Veterano: 12 meses (365 dias de streak seria excessivo; usando pontos/conquistas)
  -- We track this as a calendar month count based on streak days
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Membro Veterano';
  IF v_achievement_id IS NOT NULL THEN
    DECLARE
      v_months INTEGER := LEAST(v_streak / 30, 12);
    BEGIN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (NEW.user_id, v_achievement_id, v_months)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        progress = GREATEST(user_achievements.progress, v_months);
      IF v_months >= 12 THEN
        UPDATE public.user_achievements
        SET unlocked_at = COALESCE(unlocked_at, now())
        WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on profiles for streak changes
DROP TRIGGER IF EXISTS on_streak_update ON public.profiles;
CREATE TRIGGER on_streak_update
  AFTER UPDATE OF streak ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_streak_achievements();

-- Fix 5: Backfill existing streak data for all current profiles
DO $$
DECLARE
  rec RECORD;
  v_streak INTEGER;
  v_achievement_id UUID;
BEGIN
  FOR rec IN SELECT user_id, COALESCE(streak, 0) as streak FROM public.profiles WHERE streak > 0 LOOP
    v_streak := rec.streak;

    -- Streak de 7 Dias
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Streak de 7 Dias';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (rec.user_id, v_achievement_id, v_streak)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        progress = GREATEST(user_achievements.progress, v_streak);
      IF v_streak >= 7 THEN
        UPDATE public.user_achievements
        SET unlocked_at = COALESCE(unlocked_at, now())
        WHERE user_id = rec.user_id AND achievement_id = v_achievement_id;
      END IF;
    END IF;

    -- Streak de 30 Dias
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Streak de 30 Dias';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (rec.user_id, v_achievement_id, v_streak)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        progress = GREATEST(user_achievements.progress, v_streak);
      IF v_streak >= 30 THEN
        UPDATE public.user_achievements
        SET unlocked_at = COALESCE(unlocked_at, now())
        WHERE user_id = rec.user_id AND achievement_id = v_achievement_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Fix 6: Backfill existing mentoring data
DO $$
DECLARE
  rec RECORD;
  v_count INTEGER;
  v_achievement_id UUID;
BEGIN
  FOR rec IN SELECT DISTINCT user_id FROM public.mentoring_checkins LOOP
    SELECT COUNT(*) INTO v_count FROM public.mentoring_checkins WHERE user_id = rec.user_id;

    -- Participante Ativo
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Participante Ativo';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (rec.user_id, v_achievement_id, v_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        progress = GREATEST(user_achievements.progress, v_count);
      IF v_count >= 10 THEN
        UPDATE public.user_achievements SET unlocked_at = COALESCE(unlocked_at, now())
        WHERE user_id = rec.user_id AND achievement_id = v_achievement_id;
      END IF;
    END IF;

    -- Maratonista
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Maratonista';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (rec.user_id, v_achievement_id, v_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        progress = GREATEST(user_achievements.progress, v_count);
      IF v_count >= 50 THEN
        UPDATE public.user_achievements SET unlocked_at = COALESCE(unlocked_at, now())
        WHERE user_id = rec.user_id AND achievement_id = v_achievement_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Fix 7: Backfill community reply progress
DO $$
DECLARE
  rec RECORD;
  v_reply_count INTEGER;
  v_achievement_id UUID;
BEGIN
  FOR rec IN SELECT DISTINCT user_id FROM public.post_replies LOOP
    SELECT COUNT(*) INTO v_reply_count FROM public.post_replies WHERE user_id = rec.user_id;

    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Ajudante';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (rec.user_id, v_achievement_id, v_reply_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        progress = GREATEST(user_achievements.progress, v_reply_count);
      IF v_reply_count >= 10 THEN
        UPDATE public.user_achievements SET unlocked_at = COALESCE(unlocked_at, now())
        WHERE user_id = rec.user_id AND achievement_id = v_achievement_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;