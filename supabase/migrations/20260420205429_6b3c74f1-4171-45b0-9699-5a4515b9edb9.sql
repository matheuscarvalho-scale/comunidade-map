-- Função que remove roles pagas quando assinatura é cancelada/reembolsada/inativa
CREATE OR REPLACE FUNCTION public.revoke_paid_roles_on_subscription_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só age quando o status muda para um estado de perda de acesso
  IF NEW.subscription_status IN ('refunded', 'cancelled', 'canceled', 'inactive', 'expired')
     AND (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN
    
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role IN ('basic', 'pro', 'business');
    
    RAISE NOTICE 'Roles pagas removidas do user % devido a status: %', NEW.user_id, NEW.subscription_status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger na tabela profiles
DROP TRIGGER IF EXISTS trigger_revoke_paid_roles_on_subscription_end ON public.profiles;
CREATE TRIGGER trigger_revoke_paid_roles_on_subscription_end
AFTER UPDATE OF subscription_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.revoke_paid_roles_on_subscription_end();