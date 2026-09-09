
-- Create cashback.manage permission
INSERT INTO public.permissions (name, description, resource, action)
VALUES ('cashback.manage', 'Gerenciar cashback de todos os usuários', 'cashback', 'manage')
ON CONFLICT DO NOTHING;
