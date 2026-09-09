
-- Allow all authenticated users to read role_permissions for their own roles
CREATE POLICY "Authenticated users can view own role permissions"
ON public.role_permissions
FOR SELECT
USING (
  role IN (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid())
);

-- Allow all authenticated users to read permissions referenced by their roles
CREATE POLICY "Authenticated users can view own permissions"
ON public.permissions
FOR SELECT
USING (
  id IN (
    SELECT rp.permission_id 
    FROM public.role_permissions rp 
    JOIN public.user_roles ur ON ur.role = rp.role 
    WHERE ur.user_id = auth.uid()
  )
);
