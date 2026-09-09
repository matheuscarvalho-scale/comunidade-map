
-- 1) Lock audit_logs INSERT to service_role only (preserve log integrity)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT TO service_role WITH CHECK (true);

-- 2) Force SECURITY INVOKER on views so they respect the caller's RLS
ALTER VIEW public.mentoring_sessions_public SET (security_invoker = on);
ALTER VIEW public.mentors_public SET (security_invoker = on);
