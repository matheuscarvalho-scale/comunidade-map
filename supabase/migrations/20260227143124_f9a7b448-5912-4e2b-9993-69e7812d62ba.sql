
-- Step 2: Update data from 'cs' to 'cx'
UPDATE public.user_roles SET role = 'cx' WHERE role = 'cs';
UPDATE public.role_permissions SET role = 'cx' WHERE role = 'cs';

-- Update the get_user_highest_role function
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY
    CASE role
      WHEN 'admin_geral' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'admin_financeiro' THEN 3
      WHEN 'admin_conteudo' THEN 4
      WHEN 'cx' THEN 5
      WHEN 'comercial' THEN 6
      WHEN 'marketing' THEN 7
      WHEN 'automacao' THEN 8
      WHEN 'enterprise' THEN 9
      WHEN 'pro' THEN 10
      WHEN 'starter' THEN 11
      ELSE 99
    END
  LIMIT 1;
$function$;
