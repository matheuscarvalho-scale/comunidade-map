-- Function: sync subscription from primary user to all their secondary login users
CREATE OR REPLACE FUNCTION public.sync_secondary_login_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if subscription-related fields changed
  IF (
    NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan OR
    NEW.subscription_status IS DISTINCT FROM OLD.subscription_status OR
    NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date OR
    NEW.subscription_start_date IS DISTINCT FROM OLD.subscription_start_date
  ) THEN
    -- Update all active secondary users linked to this primary user
    UPDATE public.profiles AS p
    SET
      subscription_plan         = NEW.subscription_plan,
      subscription_status       = NEW.subscription_status,
      subscription_end_date     = NEW.subscription_end_date,
      subscription_start_date   = NEW.subscription_start_date,
      updated_at                = now()
    FROM public.secondary_logins AS sl
    WHERE sl.primary_user_id   = NEW.user_id
      AND sl.secondary_user_id IS NOT NULL
      AND sl.is_active          = true
      AND p.user_id             = sl.secondary_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: fires after any update on profiles
DROP TRIGGER IF EXISTS trg_sync_secondary_subscriptions ON public.profiles;

CREATE TRIGGER trg_sync_secondary_subscriptions
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_secondary_login_subscriptions();