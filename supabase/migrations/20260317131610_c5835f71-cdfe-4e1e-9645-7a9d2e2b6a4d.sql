
CREATE OR REPLACE FUNCTION public.sync_subscription_plan_to_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subscription_plan IS NOT NULL AND NEW.subscription_plan != '' THEN
    DELETE FROM public.user_roles 
    WHERE user_id = NEW.user_id 
      AND role IN ('basic', 'pro', 'business', 'starter', 'enterprise');
    
    IF NEW.subscription_plan IN ('basic', 'pro', 'business', 'starter', 'enterprise') THEN
      DECLARE
        mapped_role app_role;
      BEGIN
        mapped_role := CASE NEW.subscription_plan
          WHEN 'starter' THEN 'basic'::app_role
          WHEN 'enterprise' THEN 'business'::app_role
          ELSE NEW.subscription_plan::app_role
        END;
        
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.user_id, mapped_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
