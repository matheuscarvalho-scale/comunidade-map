-- Add unique constraint on (user_id, role) for user_roles to enable upsert
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);