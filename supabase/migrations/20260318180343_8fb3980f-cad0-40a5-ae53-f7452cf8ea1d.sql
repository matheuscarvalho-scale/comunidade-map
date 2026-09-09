
-- =============================================
-- 1. REMOVE DUPLICATE TRIGGERS
-- =============================================

-- profiles: keep only one streak trigger
DROP TRIGGER IF EXISTS on_streak_update ON public.profiles;
-- keep check_streak_achievements_trigger

-- post_likes: keep only one
DROP TRIGGER IF EXISTS on_post_like_achievement ON public.post_likes;
-- keep check_likes_achievements_trigger

-- post_replies: keep only one community achievements trigger
DROP TRIGGER IF EXISTS on_post_reply ON public.post_replies;
-- keep check_community_achievements_replies_trigger

-- post_replies: keep only one leader trigger
DROP TRIGGER IF EXISTS on_post_reply_leader ON public.post_replies;
-- keep check_leader_achievement_trigger

-- =============================================
-- 2. FIX FOUNDING MEMBER - remove manual points/notification
--    (notify_achievement_unlock trigger already handles this)
-- =============================================

CREATE OR REPLACE FUNCTION public.check_founding_member_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement_id uuid := '368a54e0-4efa-438d-98d3-1cb2772dcaaf';
  v_profile_created timestamptz;
BEGIN
  IF NEW.role NOT IN ('basic', 'starter', 'pro', 'enterprise', 'business') THEN
    RETURN NEW;
  END IF;

  SELECT created_at INTO v_profile_created
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF v_profile_created IS NOT NULL AND v_profile_created < '2026-05-21T00:00:00Z' THEN
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
    VALUES (NEW.user_id, v_achievement_id, 1, now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    -- Points and notification are handled by notify_achievement_unlock trigger
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- 3. ADD "Primeiro Acesso" trigger on profiles INSERT
-- =============================================

CREATE OR REPLACE FUNCTION public.check_first_access_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement_id UUID;
BEGIN
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Primeiro Acesso';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
    VALUES (NEW.user_id, v_achievement_id, now(), 1)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_first_access_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_first_access_achievement();

-- =============================================
-- 4. ADD "Formação Completa" and "Mestre do Conhecimento" via certificates
-- =============================================

CREATE OR REPLACE FUNCTION public.check_formation_completion_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_formation_count INTEGER;
  v_achievement_id UUID;
BEGIN
  -- Count completed formations for this user
  SELECT COUNT(*) INTO v_formation_count
  FROM public.certificates
  WHERE user_id = NEW.user_id;

  -- Formação Completa (first formation)
  IF v_formation_count >= 1 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Formação Completa';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), v_formation_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        unlocked_at = COALESCE(user_achievements.unlocked_at, now()),
        progress = v_formation_count;
    END IF;
  END IF;

  -- Mestre do Conhecimento (5 formations)
  SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Mestre do Conhecimento';
  IF v_achievement_id IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress)
    VALUES (NEW.user_id, v_achievement_id, v_formation_count)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = GREATEST(user_achievements.progress, v_formation_count);
    IF v_formation_count >= 5 THEN
      UPDATE public.user_achievements
      SET unlocked_at = COALESCE(unlocked_at, now())
      WHERE user_id = NEW.user_id AND achievement_id = v_achievement_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_formation_completion_trigger
  AFTER INSERT ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.check_formation_completion_achievements();

-- =============================================
-- 5. RETROACTIVELY GRANT "Primeiro Acesso" to existing users
-- =============================================

INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
SELECT p.user_id, a.id, p.created_at, 1
FROM public.profiles p
CROSS JOIN public.achievements a
WHERE a.name = 'Primeiro Acesso'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- =============================================
-- 6. RETROACTIVELY GRANT formation achievements to existing certificate holders
-- =============================================

-- Formação Completa for anyone with at least 1 certificate
INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
SELECT c.user_id, a.id, MIN(c.completed_at), COUNT(*)
FROM public.certificates c
CROSS JOIN public.achievements a
WHERE a.name = 'Formação Completa'
GROUP BY c.user_id, a.id
HAVING COUNT(*) >= 1
ON CONFLICT (user_id, achievement_id) DO UPDATE SET
  unlocked_at = COALESCE(user_achievements.unlocked_at, EXCLUDED.unlocked_at),
  progress = EXCLUDED.progress;

-- Mestre do Conhecimento for anyone with 5+ certificates
INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
SELECT c.user_id, a.id, MIN(c.completed_at), COUNT(*)
FROM public.certificates c
CROSS JOIN public.achievements a
WHERE a.name = 'Mestre do Conhecimento'
GROUP BY c.user_id, a.id
HAVING COUNT(*) >= 5
ON CONFLICT (user_id, achievement_id) DO UPDATE SET
  unlocked_at = COALESCE(user_achievements.unlocked_at, EXCLUDED.unlocked_at),
  progress = EXCLUDED.progress;

-- Update progress for those with < 5 certificates
INSERT INTO public.user_achievements (user_id, achievement_id, progress)
SELECT c.user_id, a.id, COUNT(*)
FROM public.certificates c
CROSS JOIN public.achievements a
WHERE a.name = 'Mestre do Conhecimento'
GROUP BY c.user_id, a.id
HAVING COUNT(*) < 5
ON CONFLICT (user_id, achievement_id) DO UPDATE SET
  progress = GREATEST(user_achievements.progress, EXCLUDED.progress);
