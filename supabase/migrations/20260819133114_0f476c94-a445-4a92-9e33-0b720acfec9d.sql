CREATE OR REPLACE VIEW public.profiles_admin AS
SELECT id, user_id, name, avatar_url, streak, total_points, created_at, updated_at, bio,
       specialties, location, social_links, subscription_plan, subscription_status,
       subscription_start_date, subscription_end_date, niche, location_state, location_city,
       experience_level, website_url, instagram_url, linkedin_url, is_public, job_title,
       company, industry, pending_plan, upgrade_status, upgrade_requested_at,
       cancel_reason, cancel_reason_detail, cancel_source
FROM profiles
WHERE (has_role(auth.uid(), 'admin'::app_role)
   OR has_role(auth.uid(), 'admin_geral'::app_role)
   OR has_role(auth.uid(), 'admin_financeiro'::app_role)
   OR has_permission(auth.uid(), 'subscriptions.manage'::text));

GRANT SELECT ON public.profiles_admin TO authenticated;
GRANT UPDATE (subscription_plan, subscription_status, subscription_start_date, subscription_end_date,
              pending_plan, upgrade_status, upgrade_requested_at,
              cancel_reason, cancel_reason_detail, cancel_source)
  ON public.profiles_admin TO authenticated;