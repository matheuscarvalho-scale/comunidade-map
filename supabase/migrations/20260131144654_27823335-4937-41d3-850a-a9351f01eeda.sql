-- Create a public view for user_onboarding that exposes only non-sensitive fields
-- This protects PII (whatsapp, city_state) while allowing the app to function

CREATE VIEW public.user_onboarding_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    terms_accepted_at,
    terms_version,
    current_step,
    completed_at,
    experience_level,
    business_models,
    main_goal,
    weekly_hours,
    revenue_goal,
    created_at,
    updated_at
    -- Excluded: full_name, whatsapp, city_state (PII)
  FROM public.user_onboarding;

-- Note: The base table already has RLS that restricts users to their own data.
-- The view inherits these RLS policies via security_invoker=on.
-- Users can still read/write their own full records via the base table for the onboarding flow,
-- but the view provides a safer interface for general usage.

COMMENT ON VIEW public.user_onboarding_public IS 'Public view of user_onboarding excluding PII (whatsapp, city_state, full_name)';