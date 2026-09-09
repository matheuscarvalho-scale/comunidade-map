
-- Create sellers.manage permission
INSERT INTO public.permissions (name, description, resource, action)
VALUES ('sellers.manage', 'Gerenciar vendedores e vendas', 'sellers', 'manage');

-- Assign to admin and admin_geral roles
INSERT INTO public.role_permissions (permission_id, role)
SELECT p.id, r.role
FROM public.permissions p
CROSS JOIN (VALUES ('admin'::app_role), ('admin_geral'::app_role)) AS r(role)
WHERE p.name = 'sellers.manage';
