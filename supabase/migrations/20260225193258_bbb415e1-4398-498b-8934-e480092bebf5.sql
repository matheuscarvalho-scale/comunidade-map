
-- Restaurar TODOS os triggers do public schema que foram perdidos
-- Usando DROP IF EXISTS para evitar conflitos

-- 2. Trigger: update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 3. Trigger: prevent self-update of subscription fields
DROP TRIGGER IF EXISTS prevent_profile_subscription_self_update ON public.profiles;
CREATE TRIGGER prevent_profile_subscription_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_subscription_self_update();

-- 4. Trigger: sync secondary login subscriptions
DROP TRIGGER IF EXISTS sync_secondary_subscriptions ON public.profiles;
CREATE TRIGGER sync_secondary_subscriptions
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_secondary_login_subscriptions();

-- 5. Trigger: check streak achievements
DROP TRIGGER IF EXISTS check_streak_achievements_trigger ON public.profiles;
CREATE TRIGGER check_streak_achievements_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_streak_achievements();

-- 6-7. Triggers on formation_lesson_progress
DROP TRIGGER IF EXISTS check_lesson_achievements_trigger ON public.formation_lesson_progress;
CREATE TRIGGER check_lesson_achievements_trigger
  AFTER INSERT OR UPDATE ON public.formation_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lesson_achievements();

DROP TRIGGER IF EXISTS check_formation_completion_trigger ON public.formation_lesson_progress;
CREATE TRIGGER check_formation_completion_trigger
  AFTER INSERT OR UPDATE ON public.formation_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_formation_completion();

-- 8. Achievement unlock notification
DROP TRIGGER IF EXISTS notify_achievement_unlock_trigger ON public.user_achievements;
CREATE TRIGGER notify_achievement_unlock_trigger
  AFTER INSERT OR UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_achievement_unlock();

-- 9. Webinar achievements
DROP TRIGGER IF EXISTS check_webinar_achievements_trigger ON public.webinar_checkins;
CREATE TRIGGER check_webinar_achievements_trigger
  AFTER INSERT ON public.webinar_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.check_webinar_achievements();

-- 10. Mentoring achievements
DROP TRIGGER IF EXISTS check_mentoring_achievements_trigger ON public.mentoring_checkins;
CREATE TRIGGER check_mentoring_achievements_trigger
  AFTER INSERT ON public.mentoring_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.check_mentoring_achievements();

-- 11-12. Community achievements
DROP TRIGGER IF EXISTS check_community_achievements_posts_trigger ON public.community_posts;
CREATE TRIGGER check_community_achievements_posts_trigger
  AFTER INSERT ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_community_achievements();

DROP TRIGGER IF EXISTS check_community_achievements_replies_trigger ON public.post_replies;
CREATE TRIGGER check_community_achievements_replies_trigger
  AFTER INSERT ON public.post_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.check_community_achievements();

-- 13. Likes achievements
DROP TRIGGER IF EXISTS check_likes_achievements_trigger ON public.post_likes;
CREATE TRIGGER check_likes_achievements_trigger
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_likes_achievements();

-- 14. Leader achievement
DROP TRIGGER IF EXISTS check_leader_achievement_trigger ON public.post_replies;
CREATE TRIGGER check_leader_achievement_trigger
  AFTER INSERT OR DELETE ON public.post_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.check_leader_achievement();

-- 15. Replies count
DROP TRIGGER IF EXISTS update_replies_count_trigger ON public.post_replies;
CREATE TRIGGER update_replies_count_trigger
  AFTER INSERT OR DELETE ON public.post_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_replies_count();

-- 16. Suggestion votes count
DROP TRIGGER IF EXISTS update_suggestion_votes_count_trigger ON public.suggestion_votes;
CREATE TRIGGER update_suggestion_votes_count_trigger
  AFTER INSERT OR DELETE ON public.suggestion_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_suggestion_votes_count();

-- 17. Suggestion comments count
DROP TRIGGER IF EXISTS update_suggestion_comments_count_trigger ON public.suggestion_comments;
CREATE TRIGGER update_suggestion_comments_count_trigger
  AFTER INSERT OR DELETE ON public.suggestion_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_suggestion_comments_count();

-- 18. Webinar reminder validation
DROP TRIGGER IF EXISTS validate_reminder_type_trigger ON public.webinar_email_reminders;
CREATE TRIGGER validate_reminder_type_trigger
  BEFORE INSERT OR UPDATE ON public.webinar_email_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reminder_type();

-- 19. Mentoring reminder validation
DROP TRIGGER IF EXISTS validate_mentoring_reminder_type_trigger ON public.mentoring_email_reminders;
CREATE TRIGGER validate_mentoring_reminder_type_trigger
  BEFORE INSERT OR UPDATE ON public.mentoring_email_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_mentoring_reminder_type();

-- 20. Webinar reminders cascade delete
DROP TRIGGER IF EXISTS delete_webinar_reminders_cascade_trigger ON public.webinar_checkins;
CREATE TRIGGER delete_webinar_reminders_cascade_trigger
  AFTER DELETE ON public.webinar_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_webinar_reminders_cascade();

-- 21. Mentoring reminders cascade delete
DROP TRIGGER IF EXISTS delete_mentoring_reminders_cascade_trigger ON public.mentoring_checkins;
CREATE TRIGGER delete_mentoring_reminders_cascade_trigger
  AFTER DELETE ON public.mentoring_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_mentoring_reminders_cascade();

-- 22. Cleanup old reset attempts
DROP TRIGGER IF EXISTS cleanup_old_reset_attempts_trigger ON public.password_reset_attempts;
CREATE TRIGGER cleanup_old_reset_attempts_trigger
  AFTER INSERT ON public.password_reset_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_reset_attempts();

-- 23. Formation duration auto-update
DROP TRIGGER IF EXISTS update_formation_duration_trigger ON public.formation_lessons;
CREATE TRIGGER update_formation_duration_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.formation_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_formation_duration();

-- 24. updated_at triggers on various tables
DROP TRIGGER IF EXISTS update_secondary_login_requests_updated_at ON public.secondary_login_requests;
CREATE TRIGGER update_secondary_login_requests_updated_at
  BEFORE UPDATE ON public.secondary_login_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_secondary_logins_updated_at ON public.secondary_logins;
CREATE TRIGGER update_secondary_logins_updated_at
  BEFORE UPDATE ON public.secondary_logins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_webinars_updated_at ON public.webinars;
CREATE TRIGGER update_webinars_updated_at
  BEFORE UPDATE ON public.webinars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_cashback_usage_updated_at ON public.cashback_usage;
CREATE TRIGGER update_cashback_usage_updated_at
  BEFORE UPDATE ON public.cashback_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON public.user_onboarding;
CREATE TRIGGER update_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_user_recommendations_updated_at ON public.user_recommendations;
CREATE TRIGGER update_user_recommendations_updated_at
  BEFORE UPDATE ON public.user_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
