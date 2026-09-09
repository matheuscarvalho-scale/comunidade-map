create or replace function public.get_onboarding_icp_distribution()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare _result json;
begin
  perform public.mkt_guard();

  with base as (
    select o.* from public.user_onboarding o
    where not public.mkt_is_internal(o.user_id)
  ),
  scalar_dims as (
    select 'experience_level' as dimension, coalesce(nullif(experience_level,''),'não informado') as value from base
    union all select 'main_goal', coalesce(nullif(main_goal,''),'não informado') from base
    union all select 'weekly_hours', coalesce(nullif(weekly_hours,''),'não informado') from base
    union all select 'revenue_goal', coalesce(nullif(revenue_goal,''),'não informado') from base
    union all select 'ecommerce_platform', coalesce(nullif(ecommerce_platform,''),'não informado') from base
    union all select 'business_niche', coalesce(nullif(coalesce(business_niche, business_niche_other),''),'não informado') from base
    union all select 'employee_range', coalesce(nullif(employee_range,''),'não informado') from base
    union all select 'average_ticket', coalesce(nullif(average_ticket,''),'não informado') from base
    union all select 'job_title', coalesce(nullif(job_title,''),'não informado') from base
    union all select 'accounting_service', coalesce(nullif(accounting_service,''),'não informado') from base
    union all select 'ai_tools', coalesce(nullif(ai_tools,''),'não informado') from base
    union all select 'supplier_needs', coalesce(nullif(supplier_needs,''),'não informado') from base
    union all select 'uses_erp', case when uses_erp is null then 'não informado' when uses_erp then 'sim' else 'não' end from base
    union all select 'uses_ai', case when uses_ai is null then 'não informado' when uses_ai then 'sim' else 'não' end from base
    union all select 'uses_accounting', case when uses_accounting is null then 'não informado' when uses_accounting then 'sim' else 'não' end from base
    union all select 'has_supplier_difficulty', case when has_supplier_difficulty is null then 'não informado' when has_supplier_difficulty then 'sim' else 'não' end from base
    union all select 'city_state', coalesce(nullif(city_state,''),'não informado') from base
  ),
  array_dims as (
    select 'business_models' as dimension, unnest(coalesce(business_models, '{}'::text[])) as value from base
    union all select 'sales_channels', unnest(coalesce(sales_channels, '{}'::text[])) from base
    union all select 'erp_tools', unnest(coalesce(erp_tools, '{}'::text[])) from base
  ),
  all_dims as (
    select dimension, value from scalar_dims
    union all select dimension, value from array_dims
  ),
  counted as (
    select dimension, value, count(*) as total
    from all_dims where value is not null and value <> ''
    group by 1, 2
  )
  select json_build_object(
    'responses_total', (select count(*) from base),
    'completed_total', (select count(*) from base where completed_at is not null),
    'with_cnpj', (select count(*) from base where coalesce(cnpj,'') <> ''),
    'distributions', coalesce((
      select json_agg(json_build_object('dimension', dimension, 'value', value, 'count', total)
                      order by dimension, total desc)
      from counted
    ), '[]'::json)
  ) into _result;

  return _result;
end;
$$;

grant execute on function public.get_onboarding_icp_distribution() to authenticated, service_role;