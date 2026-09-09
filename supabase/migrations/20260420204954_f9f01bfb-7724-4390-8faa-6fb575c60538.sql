DELETE FROM public.user_roles
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'essenciamodaintima12@gmail.com'
)
AND role IN ('pro', 'basic', 'business');