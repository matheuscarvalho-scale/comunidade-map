
-- Update the trigger function to remove references to dropped columns
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
    THEN
      RAISE EXCEPTION 'Not allowed to update subscription fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
