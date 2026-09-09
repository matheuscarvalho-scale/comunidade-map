
-- Migrate existing data
UPDATE public.user_roles SET role = 'admin_geral' WHERE role = 'super_admin';

-- Update has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role = 'admin_geral')
  )
$$;

-- Update get_user_highest_role function
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY
    CASE role
      WHEN 'admin_geral' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'admin_financeiro' THEN 3
      WHEN 'admin_conteudo' THEN 4
      WHEN 'cs' THEN 5
      WHEN 'comercial' THEN 6
      WHEN 'marketing' THEN 7
      WHEN 'automacao' THEN 8
      WHEN 'enterprise' THEN 9
      WHEN 'pro' THEN 10
      WHEN 'starter' THEN 11
      ELSE 99
    END
  LIMIT 1;
$$;

-- RLS policies: resources
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources;
CREATE POLICY "Admins can delete resources" ON public.resources
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));

DROP POLICY IF EXISTS "Admins can insert resources" ON public.resources;
CREATE POLICY "Admins can insert resources" ON public.resources
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));

DROP POLICY IF EXISTS "Admins can update resources" ON public.resources;
CREATE POLICY "Admins can update resources" ON public.resources
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));

-- RLS policies: permissions
DROP POLICY IF EXISTS "Admins can view permissions" ON public.permissions;
CREATE POLICY "Admins can view permissions" ON public.permissions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));

DROP POLICY IF EXISTS "Super admins can manage permissions" ON public.permissions;
CREATE POLICY "Admin geral can manage permissions" ON public.permissions
FOR ALL USING (has_role(auth.uid(), 'admin_geral'::app_role));

-- RLS policies: audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));

-- RLS policies: formations
DROP POLICY IF EXISTS "Admins can manage formations" ON public.formations;
CREATE POLICY "Admins can manage formations" ON public.formations
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_role(auth.uid(), 'admin_conteudo'::app_role));

-- RLS policies: formation_lessons
DROP POLICY IF EXISTS "Admins can manage formation lessons" ON public.formation_lessons;
CREATE POLICY "Admins can manage formation lessons" ON public.formation_lessons
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_role(auth.uid(), 'admin_conteudo'::app_role));
