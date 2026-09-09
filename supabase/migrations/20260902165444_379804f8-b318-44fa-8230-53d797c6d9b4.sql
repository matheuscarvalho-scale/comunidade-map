ALTER TABLE public.password_reset_attempts ADD COLUMN IF NOT EXISTS ip_address text;
CREATE INDEX IF NOT EXISTS idx_pwd_reset_attempts_ip_time ON public.password_reset_attempts (ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_attempts_email_time ON public.password_reset_attempts (email, attempted_at);
DELETE FROM public.password_reset_attempts WHERE attempted_at < now() - interval '24 hours';