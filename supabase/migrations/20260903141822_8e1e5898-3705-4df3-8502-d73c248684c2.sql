CREATE OR REPLACE FUNCTION public.mkt_guard()
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.role() = 'service_role' then return; end if;
  if auth.uid() is not null and (
       public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'admin_geral')
    or public.has_role(auth.uid(), 'admin_financeiro')
    or public.has_role(auth.uid(), 'marketing')
  ) then return; end if;
  raise exception 'not authorized';
end;
$function$;

DO $do$
DECLARE
  r record;
  keep text[] := '{}';
  n_revoked int := 0;
  n_granted int := 0;
BEGIN
  -- (a) snapshot: quais funções authenticated já podia executar
  FOR r IN
    SELECT p.oid, p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  LOOP
    keep := keep || r.sig;
  END LOOP;

  -- (b) fecha para PUBLIC e anon
  EXECUTE 'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon';

  -- (c) devolve para authenticated só o que ela já tinha
  FOREACH r IN ARRAY '{}'::record[] LOOP END LOOP;
  RAISE NOTICE 'snapshot size: %', array_length(keep, 1);
  FOR n_granted IN 1..COALESCE(array_length(keep, 1), 0) LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', keep[n_granted]);
  END LOOP;

  -- (d) service_role mantém tudo
  EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role';

  RAISE NOTICE 'funcoes regrantadas para authenticated: %', COALESCE(array_length(keep,1),0);
END
$do$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;