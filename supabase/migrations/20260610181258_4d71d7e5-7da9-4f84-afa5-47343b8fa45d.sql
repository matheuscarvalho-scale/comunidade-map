
-- 1) Trigger to mirror primary subscription to secondary profile when secondary_user_id is set
CREATE OR REPLACE FUNCTION public.sync_primary_to_new_secondary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prim RECORD;
  mapped_role app_role;
BEGIN
  IF NEW.secondary_user_id IS NULL OR NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Only run when secondary_user_id was just set (insert) or changed
  IF (TG_OP = 'UPDATE' AND OLD.secondary_user_id IS NOT DISTINCT FROM NEW.secondary_user_id
      AND OLD.is_active IS NOT DISTINCT FROM NEW.is_active) THEN
    RETURN NEW;
  END IF;

  SELECT subscription_plan, subscription_status, subscription_start_date, subscription_end_date
    INTO prim
  FROM public.profiles
  WHERE user_id = NEW.primary_user_id;

  IF prim IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET subscription_plan       = prim.subscription_plan,
      subscription_status     = prim.subscription_status,
      subscription_start_date = prim.subscription_start_date,
      subscription_end_date   = prim.subscription_end_date,
      updated_at              = now()
  WHERE user_id = NEW.secondary_user_id;

  -- Ensure role is granted (the role sync trigger only fires on UPDATE OF subscription_plan,
  -- which the UPDATE above does trigger, but we also enforce here to cover edge cases)
  IF prim.subscription_plan IN ('basic','pro','business','starter','enterprise') THEN
    mapped_role := CASE prim.subscription_plan
      WHEN 'starter' THEN 'basic'::app_role
      WHEN 'enterprise' THEN 'business'::app_role
      ELSE prim.subscription_plan::app_role
    END;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.secondary_user_id, mapped_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_primary_to_new_secondary ON public.secondary_logins;
CREATE TRIGGER trg_sync_primary_to_new_secondary
AFTER INSERT OR UPDATE ON public.secondary_logins
FOR EACH ROW EXECUTE FUNCTION public.sync_primary_to_new_secondary();

-- 2) Backfill: mirror primary subscription to all existing active secondaries
UPDATE public.profiles AS p
SET subscription_plan       = pp.subscription_plan,
    subscription_status     = pp.subscription_status,
    subscription_start_date = pp.subscription_start_date,
    subscription_end_date   = pp.subscription_end_date,
    updated_at              = now()
FROM public.secondary_logins sl
JOIN public.profiles pp ON pp.user_id = sl.primary_user_id
WHERE sl.is_active = true
  AND sl.secondary_user_id IS NOT NULL
  AND p.user_id = sl.secondary_user_id
  AND (
    p.subscription_plan   IS DISTINCT FROM pp.subscription_plan OR
    p.subscription_status IS DISTINCT FROM pp.subscription_status
  );

-- 3) Backfill roles for secondaries based on primary plan
INSERT INTO public.user_roles (user_id, role)
SELECT sl.secondary_user_id,
       CASE pp.subscription_plan
         WHEN 'starter'    THEN 'basic'::app_role
         WHEN 'enterprise' THEN 'business'::app_role
         ELSE pp.subscription_plan::app_role
       END
FROM public.secondary_logins sl
JOIN public.profiles pp ON pp.user_id = sl.primary_user_id
WHERE sl.is_active = true
  AND sl.secondary_user_id IS NOT NULL
  AND pp.subscription_plan IN ('basic','pro','business','starter','enterprise')
ON CONFLICT (user_id, role) DO NOTHING;
