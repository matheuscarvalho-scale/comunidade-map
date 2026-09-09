
-- Allow users to cancel their own webinar checkins
CREATE POLICY "Users can cancel own webinar checkins"
ON public.webinar_checkins
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to cancel their own mentoring checkins
CREATE POLICY "Users can cancel own mentoring checkins"
ON public.mentoring_checkins
FOR DELETE
USING (auth.uid() = user_id);
