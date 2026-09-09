
-- Step 1: Add new enum values only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_financeiro';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_conteudo';
