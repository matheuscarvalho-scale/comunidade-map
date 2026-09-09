
-- =============================================
-- 1. Fix Membro Veterano: change max_progress from 12 (months) to 365 (days)
-- =============================================
UPDATE public.achievements 
SET max_progress = 365 
WHERE name = 'Membro Veterano';

-- =============================================
-- 2. Update check_streak_achievements to use streak days directly (not months)
-- =============================================
CREATE OR REPLACE FUNCTION public.check_streak_achievements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Membro Veterano: 365 dias de streak
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Membro Veterano';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, v_achievement_id, v_streak)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = GREATEST(user_achievements.progress, v_streak);
    IF v_streak >= 365 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- =============================================
-- 3. Function to check likes-based achievements (Influenciador)
-- =============================================
CREATE OR REPLACE FUNCTION public.check_likes_achievements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_post_owner_id UUID;
  v_total_likes INTEGER;
  v_achievement_id UUID;
BEGIN
  -- Get the owner of the post that was liked/unliked
  IF TG_OP = 'DELETE' THEN
    SELECT user_id INTO v_post_owner_id FROM public.community_posts WHERE id = OLD.post_id;
  ELSE
    SELECT user_id INTO v_post_owner_id FROM public.community_posts WHERE id = NEW.post_id;
  END IF;

  IF v_post_owner_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count total likes across all posts by this user
  SELECT COALESCE(SUM(likes_count), 0) INTO v_total_likes
  FROM public.community_posts
  WHERE user_id = v_post_owner_id;

  -- Influenciador: 100 curtidas nos posts
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Influenciador';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (v_post_owner_id, v_achievement_id, v_total_likes)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = v_total_likes;
    IF v_total_likes >= 100 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = v_post_owner_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Trigger on post_likes for Influenciador achievement
DROP TRIGGER IF EXISTS on_post_like_achievement ON public.post_likes;
CREATE TRIGGER on_post_like_achievement
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_likes_achievements();

-- =============================================
-- 4. Function to check replies-based achievements (Líder da Comunidade)
-- =============================================
CREATE OR REPLACE FUNCTION public.check_leader_achievement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_post_owner_id UUID;
  v_max_replies INTEGER;
  v_achievement_id UUID;
  v_post_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_post_id := OLD.post_id;
  ELSE
    v_post_id := NEW.post_id;
  END IF;

  -- Get the owner of the post
  SELECT user_id INTO v_post_owner_id FROM public.community_posts WHERE id = v_post_id;
  IF v_post_owner_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Find the max replies_count on any single post by this user
  SELECT COALESCE(MAX(replies_count), 0) INTO v_max_replies
  FROM public.community_posts
  WHERE user_id = v_post_owner_id;

  -- Líder da Comunidade: ter um post com mais de 50 respostas
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Líder da Comunidade';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (v_post_owner_id, v_achievement_id, v_max_replies)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = v_max_replies;
    IF v_max_replies >= 50 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = v_post_owner_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Trigger on post_replies for Líder da Comunidade achievement
DROP TRIGGER IF EXISTS on_post_reply_leader ON public.post_replies;
CREATE TRIGGER on_post_reply_leader
  AFTER INSERT OR DELETE ON public.post_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.check_leader_achievement();

-- =============================================
-- 5. Backfill existing data for all users
-- =============================================

-- Backfill Membro Veterano with current streak days
INSERT INTO public.user_achievements (user_id, achievement_id, progress)
SELECT 
  p.user_id,
  a.id,
  COALESCE(p.streak, 0)
FROM public.profiles p
CROSS JOIN public.achievements a
WHERE a.name = 'Membro Veterano'
  AND COALESCE(p.streak, 0) > 0
ON CONFLICT (user_id, achievement_id) DO UPDATE SET
  progress = GREATEST(user_achievements.progress, EXCLUDED.progress);

-- Backfill Influenciador with current likes totals
INSERT INTO public.user_achievements (user_id, achievement_id, progress)
SELECT 
  cp.user_id,
  a.id,
  SUM(cp.likes_count)
FROM public.community_posts cp
CROSS JOIN public.achievements a
WHERE a.name = 'Influenciador'
GROUP BY cp.user_id, a.id
HAVING SUM(cp.likes_count) > 0
ON CONFLICT (user_id, achievement_id) DO UPDATE SET
  progress = GREATEST(user_achievements.progress, EXCLUDED.progress);

-- Backfill Líder da Comunidade with max replies on a single post
INSERT INTO public.user_achievements (user_id, achievement_id, progress)
SELECT 
  cp.user_id,
  a.id,
  MAX(cp.replies_count)
FROM public.community_posts cp
CROSS JOIN public.achievements a
WHERE a.name = 'Líder da Comunidade'
GROUP BY cp.user_id, a.id
HAVING MAX(cp.replies_count) > 0
ON CONFLICT (user_id, achievement_id) DO UPDATE SET
  progress = GREATEST(user_achievements.progress, EXCLUDED.progress);
