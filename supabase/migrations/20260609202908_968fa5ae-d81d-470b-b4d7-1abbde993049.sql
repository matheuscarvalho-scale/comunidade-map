CREATE OR REPLACE FUNCTION public.peek_conta_azul_sale_number()
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lv bigint;
  called boolean;
BEGIN
  SELECT last_value, is_called
    INTO lv, called
  FROM public.conta_azul_sale_number_seq;
  IF called THEN
    RETURN lv + 1;
  ELSE
    RETURN lv;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.peek_conta_azul_sale_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_conta_azul_sale_number() TO service_role;