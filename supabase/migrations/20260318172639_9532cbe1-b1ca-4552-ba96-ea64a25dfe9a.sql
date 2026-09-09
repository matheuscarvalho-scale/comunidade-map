
-- 1. Create notify_new_resource function and trigger
CREATE OR REPLACE FUNCTION public.notify_new_resource()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES (NULL, 'Novo Recurso Disponível', 'O recurso "' || NEW.title || '" foi adicionado!', 'new_resource', NEW.id);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER notify_new_resource_trigger
  AFTER INSERT ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_resource();

-- 2. Remove duplicate triggers
DROP TRIGGER IF EXISTS on_community_post ON public.community_posts;
DROP TRIGGER IF EXISTS on_formation_completion ON public.formation_lesson_progress;
DROP TRIGGER IF EXISTS on_lesson_progress_check_achievements ON public.formation_lesson_progress;
DROP TRIGGER IF EXISTS on_mentoring_checkin ON public.mentoring_checkins;
DROP TRIGGER IF EXISTS on_webinar_checkin ON public.webinar_checkins;
DROP TRIGGER IF EXISTS on_achievement_unlock ON public.user_achievements;
DROP TRIGGER IF EXISTS trg_notify_achievement_unlock_notification ON public.user_achievements;
DROP TRIGGER IF EXISTS on_post_reply_achievements ON public.post_replies;
DROP TRIGGER IF EXISTS trg_update_replies_count ON public.post_replies;
