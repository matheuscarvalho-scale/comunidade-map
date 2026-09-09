
CREATE POLICY "Admins can delete any reply"
ON public.post_replies
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
