-- A2: Prevent users from manipulating subscription fields
-- 1) profiles: allow admins to update any profile, but block self-updates of subscription fields for non-admins

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.prevent_profile_subscription_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only block if an authenticated non-admin user is updating their own row
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND NOT has_role(auth.uid(), 'admin'::app_role)
  THEN
    IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date
       OR NEW.subscription_start_date IS DISTINCT FROM OLD.subscription_start_date
       OR NEW.hubla_subscription_id IS DISTINCT FROM OLD.hubla_subscription_id
    THEN
      RAISE EXCEPTION 'Not allowed to update subscription fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_subscription_self_update ON public.profiles;

CREATE TRIGGER prevent_profile_subscription_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_subscription_self_update();

-- 2) subscriptions: remove user UPDATE/INSERT policies so users cannot set status/plan/expires_at directly
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;