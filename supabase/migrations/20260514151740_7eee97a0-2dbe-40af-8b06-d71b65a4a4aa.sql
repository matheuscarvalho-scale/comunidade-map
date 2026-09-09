DROP POLICY IF EXISTS "Authenticated users can view webinars" ON public.webinars;

CREATE POLICY "Authenticated users can view webinars"
ON public.webinars
FOR SELECT
TO authenticated
USING (is_active = true);