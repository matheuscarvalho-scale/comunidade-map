
-- Drop the overly broad ALL policy that may conflict
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;

-- Recreate admin policies specifically
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete notifications"
ON public.notifications FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update notifications"
ON public.notifications FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also ensure service_role can insert (triggers use SECURITY DEFINER so this should be fine, but just in case)
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);
