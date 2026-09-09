DROP POLICY IF EXISTS "Admins can view all requests" ON public.secondary_login_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.secondary_login_requests;
DROP POLICY IF EXISTS "Admins can manage secondary logins" ON public.secondary_logins;

CREATE POLICY "Managers can view all secondary login requests"
ON public.secondary_login_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  OR public.has_permission(auth.uid(), 'subscriptions.manage')
);

CREATE POLICY "Managers can review secondary login requests"
ON public.secondary_login_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  OR public.has_permission(auth.uid(), 'subscriptions.manage')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  OR public.has_permission(auth.uid(), 'subscriptions.manage')
);

CREATE POLICY "Managers can manage secondary logins"
ON public.secondary_logins
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  OR public.has_permission(auth.uid(), 'subscriptions.manage')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  OR public.has_permission(auth.uid(), 'subscriptions.manage')
);