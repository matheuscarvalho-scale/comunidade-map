
CREATE OR REPLACE FUNCTION public.sync_subscription_plan_to_role()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _new_role app_role;
BEGIN
  -- Only act when subscription_plan actually changes
  IF NEW.subscription_plan IS NOT DISTINCT FROM OLD.subscription_plan THEN
    RETURN NEW;
  END IF;

  -- Remove old member-tier roles
  DELETE FROM public.user_roles
  WHERE user_id = NEW.user_id
    AND role IN ('starter', 'pro', 'enterprise');

  -- If new plan is a valid member tier, insert the role
  IF NEW.subscription_plan IN ('starter', 'pro', 'enterprise') THEN
    _new_role := NEW.subscription_plan::app_role;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, _new_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_subscription_plan_to_role
  AFTER UPDATE OF subscription_plan ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_subscription_plan_to_role();
