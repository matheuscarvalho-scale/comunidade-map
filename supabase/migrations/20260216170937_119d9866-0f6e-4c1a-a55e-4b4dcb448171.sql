
-- 1. Achievement trigger for webinar check-ins (similar to mentoring)
CREATE OR REPLACE FUNCTION public.check_webinar_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_webinar_count INTEGER;
  v_achievement_id UUID;
BEGIN
  -- Count total webinar check-ins for this user
  SELECT COUNT(*) INTO v_webinar_count
  FROM public.webinar_checkins
  WHERE user_id = NEW.user_id;

  -- First webinar achievement
  IF v_webinar_count = 1 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Primeiro Webinar';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), 1)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET unlocked_at = COALESCE(user_achievements.unlocked_at, now());
    END IF;
  END IF;

  -- 5 webinars achievement
  IF v_webinar_count >= 5 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Fã de Webinars';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), v_webinar_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET 
        unlocked_at = COALESCE(user_achievements.unlocked_at, now()),
        progress = v_webinar_count;
    END IF;
  ELSE
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Fã de Webinars';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (NEW.user_id, v_achievement_id, v_webinar_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = v_webinar_count;
    END IF;
  END IF;

  -- 20 webinars achievement
  IF v_webinar_count >= 20 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Veterano de Webinars';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), v_webinar_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET 
        unlocked_at = COALESCE(user_achievements.unlocked_at, now()),
        progress = v_webinar_count;
    END IF;
  ELSE
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Veterano de Webinars';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (NEW.user_id, v_achievement_id, v_webinar_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = v_webinar_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER check_webinar_achievements_trigger
AFTER INSERT ON public.webinar_checkins
FOR EACH ROW
EXECUTE FUNCTION public.check_webinar_achievements();

-- 2. Insert webinar achievement records
INSERT INTO public.achievements (name, description, icon, category, points, max_progress) VALUES
  ('Primeiro Webinar', 'Participou do seu primeiro webinar', '📺', 'webinar', 10, 1),
  ('Fã de Webinars', 'Participou de 5 webinars', '🎬', 'webinar', 30, 5),
  ('Veterano de Webinars', 'Participou de 20 webinars', '🏆', 'webinar', 100, 20);

-- 3. RLS policy for admin/super_admin to delete webinar check-ins
CREATE POLICY "Admins can delete webinar checkins"
ON public.webinar_checkins
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow admins to view all checkins (needed for the management UI)
CREATE POLICY "Admins can view all webinar checkins"
ON public.webinar_checkins
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
