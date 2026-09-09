
-- 1. Add columns to existing user_roles table
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS assigned_by uuid;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view permissions" ON public.permissions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage permissions" ON public.permissions
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 3. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission_id)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role_permissions" ON public.role_permissions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage role_permissions" ON public.role_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 4. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Update has_role to treat super_admin as superset
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND (
      role = _role
      OR role = 'super_admin'
    )
  )
$$;

-- 6. Create has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.name = _permission_name
  )
$$;

-- 7. Populate permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
  ('cashback.view_own', 'Ver próprio cashback', 'cashback', 'view_own'),
  ('cashback.view_all', 'Ver todos os cashbacks', 'cashback', 'view_all'),
  ('cashback.approve', 'Aprovar cashback', 'cashback', 'approve'),
  ('cashback.reject', 'Rejeitar cashback', 'cashback', 'reject'),
  ('cashback.mark_paid', 'Marcar cashback como pago', 'cashback', 'mark_paid'),
  ('members.view_list', 'Ver lista de membros', 'members', 'view_list'),
  ('members.view_profile', 'Ver perfil de membros', 'members', 'view_profile'),
  ('members.edit', 'Editar membros', 'members', 'edit'),
  ('members.delete', 'Deletar membros', 'members', 'delete'),
  ('members.change_role', 'Alterar role de membros', 'members', 'change_role'),
  ('formations.view', 'Ver formações', 'formations', 'view'),
  ('formations.create', 'Criar formações', 'formations', 'create'),
  ('formations.edit', 'Editar formações', 'formations', 'edit'),
  ('formations.delete', 'Deletar formações', 'formations', 'delete'),
  ('certificates.view_own', 'Ver próprios certificados', 'certificates', 'view_own'),
  ('certificates.generate', 'Gerar certificados', 'certificates', 'generate'),
  ('reports.financial', 'Ver relatórios financeiros', 'reports', 'financial'),
  ('reports.content', 'Ver relatórios de conteúdo', 'reports', 'content'),
  ('audit.view_logs', 'Ver logs de auditoria', 'audit', 'view_logs')
ON CONFLICT (name) DO NOTHING;

-- 8. Populate role_permissions matrix
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin'::app_role, id FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions
WHERE name NOT IN ('members.delete', 'members.change_role')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin_financeiro'::app_role, id FROM public.permissions
WHERE name IN ('cashback.view_all', 'cashback.approve', 'cashback.reject', 'cashback.mark_paid', 'reports.financial', 'members.view_list', 'members.view_profile')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin_conteudo'::app_role, id FROM public.permissions
WHERE name IN ('formations.view', 'formations.create', 'formations.edit', 'formations.delete', 'certificates.generate', 'reports.content', 'members.view_list', 'members.view_profile')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'moderator'::app_role, id FROM public.permissions
WHERE name IN ('cashback.view_all', 'members.view_list', 'members.view_profile', 'formations.view', 'reports.content')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'user'::app_role, id FROM public.permissions
WHERE name IN ('cashback.view_own', 'formations.view', 'certificates.view_own', 'members.view_list', 'members.view_profile')
ON CONFLICT (role, permission_id) DO NOTHING;

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON public.permissions(name);
