-- Allow admins to insert checkins on behalf of users
CREATE POLICY "Admins can insert checkins"
ON public.mentoring_checkins
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete checkins (to replace participant in individual sessions)
CREATE POLICY "Admins can delete checkins"
ON public.mentoring_checkins
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));