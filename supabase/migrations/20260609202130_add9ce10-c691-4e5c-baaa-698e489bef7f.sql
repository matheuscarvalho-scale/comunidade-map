CREATE SEQUENCE IF NOT EXISTS public.conta_azul_sale_number_seq START WITH 43 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.next_conta_azul_sale_number()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('public.conta_azul_sale_number_seq');
$$;

REVOKE ALL ON FUNCTION public.next_conta_azul_sale_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_conta_azul_sale_number() TO service_role;