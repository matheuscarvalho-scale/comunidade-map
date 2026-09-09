
-- Fix SECURITY DEFINER views by setting them to SECURITY INVOKER
ALTER VIEW public.public_profiles SET (security_invoker = on);
ALTER VIEW public.mentors_public SET (security_invoker = on);
