
-- C6: Create a function to get the highest-priority role for a user
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY
    CASE role
      WHEN 'super_admin' THEN 1
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

-- C2: Create rate limiting table for password reset
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - only accessed from edge functions via service role
-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_email_time 
ON public.password_reset_attempts (email, attempted_at);

-- Auto-cleanup old records (older than 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_reset_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_attempts
  WHERE attempted_at < now() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_cleanup_reset_attempts
AFTER INSERT ON public.password_reset_attempts
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_reset_attempts();

-- C7: Create a secure view for public profile data (no sensitive fields)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  p.user_id,
  p.name,
  p.avatar_url,
  p.bio,
  p.experience_level,
  p.total_points,
  p.streak,
  p.is_public
FROM public.profiles p;

-- C8: Create a secure view for mentors that hides email from non-admins
CREATE OR REPLACE VIEW public.mentors_public AS
SELECT
  m.id,
  m.name,
  m.specialty,
  m.bio,
  m.avatar_url,
  m.created_at,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN m.email
    ELSE NULL
  END AS email
FROM public.mentors m;
