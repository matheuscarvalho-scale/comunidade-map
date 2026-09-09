ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_reason_detail text,
  ADD COLUMN IF NOT EXISTS cancel_source text;

DROP TRIGGER IF EXISTS validate_profile_cancel_reason ON public.profiles;
CREATE TRIGGER validate_profile_cancel_reason
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_cancel_reason();