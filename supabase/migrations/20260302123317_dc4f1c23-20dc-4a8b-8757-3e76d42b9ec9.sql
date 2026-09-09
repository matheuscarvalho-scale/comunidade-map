-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage webinars" ON public.webinars;

-- Create a new policy that checks the webinars.manage permission instead of a single role
CREATE POLICY "Users with webinars.manage can manage webinars"
ON public.webinars
FOR ALL
USING (has_permission(auth.uid(), 'webinars.manage'))
WITH CHECK (has_permission(auth.uid(), 'webinars.manage'));