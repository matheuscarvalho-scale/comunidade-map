create or replace function public.mkt_guard()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then return; end if;
  if current_user in ('postgres','supabase_admin','supabase_read_only_user') then return; end if;
  if auth.uid() is not null and (
       public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'admin_geral')
    or public.has_role(auth.uid(), 'admin_financeiro')
    or public.has_role(auth.uid(), 'marketing')
  ) then return; end if;
  raise exception 'not authorized';
end;
$$;

revoke all on function public.mkt_guard() from public, anon;
grant execute on function public.mkt_guard() to authenticated, service_role;