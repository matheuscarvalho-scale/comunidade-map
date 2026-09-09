-- Allow secondary users to view all members of their organization
-- (i.e., all secondary_logins sharing the same primary_user_id)
CREATE POLICY "Secondary users can view org members"
ON public.secondary_logins
FOR SELECT
USING (
  primary_user_id IN (
    SELECT primary_user_id 
    FROM public.secondary_logins 
    WHERE secondary_user_id = auth.uid()
      AND is_active = true
  )
);