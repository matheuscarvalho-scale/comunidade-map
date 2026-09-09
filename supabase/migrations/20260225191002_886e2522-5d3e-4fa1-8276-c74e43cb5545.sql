
-- Remove hubla_subscription_id column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS hubla_subscription_id;

-- Update the trigger function that still references hubla_subscription_id
CREATE OR REPLACE FUNCTION public.prevent_profile_subscription_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND NOT has_role(auth.uid(), 'admin'::app_role)
  THEN
    IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date
       OR NEW.subscription_start_date IS DISTINCT FROM OLD.subscription_start_date
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    THEN
      RAISE EXCEPTION 'Not allowed to update subscription fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
