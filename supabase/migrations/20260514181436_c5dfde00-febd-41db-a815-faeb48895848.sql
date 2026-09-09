
DROP POLICY IF EXISTS "Authenticated users can view scarcity config" ON public.webinar_scarcity_config;

CREATE POLICY "Authenticated users can view scarcity config"
ON public.webinar_scarcity_config
FOR SELECT
TO authenticated
USING (is_active = true);
