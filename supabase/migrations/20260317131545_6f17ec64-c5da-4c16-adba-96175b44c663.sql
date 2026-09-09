
-- Add new enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'basic';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'business';
