-- Create analytics.manage permission
INSERT INTO public.permissions (name, description, resource, action)
VALUES ('analytics.manage', 'Acesso ao painel de Analytics de Engajamento', 'analytics', 'manage')
ON CONFLICT DO NOTHING;

-- Assign only to admin roles (admin, admin_geral, admin_financeiro)
INSERT INTO public.role_permissions (permission_id, role)
SELECT p.id, r.role
FROM public.permissions p
CROSS JOIN (VALUES ('admin'::app_role), ('admin_geral'::app_role), ('admin_financeiro'::app_role)) AS r(role)
WHERE p.name = 'analytics.manage'
ON CONFLICT DO NOTHING;