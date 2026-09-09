-- Helpers ------------------------------------------------------------------
create or replace function public.mkt_guard()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
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
$$;

create or replace function public.mkt_is_internal(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role in ('admin','admin_geral','admin_financeiro','admin_conteudo','cx','comercial','marketing','automacao')
  );
$$;

-- E-mail (lower) por user_id, para cruzar com payment_events
create or replace function public.mkt_member_emails()
returns table(user_id uuid, email text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, lower(u.email) from auth.users u where u.email is not null;
$$;

-- Pagamentos confirmados, já com user_id resolvido
create or replace function public.mkt_payments()
returns table(user_id uuid, email text, amount numeric, plan text, paid_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, lower(pe.customer_email), coalesce(pe.amount, 0), pe.plan, pe.created_at
  from public.payment_events pe
  left join auth.users u on lower(u.email) = lower(pe.customer_email)
  where pe.event_type in ('PAYMENT_CONFIRMED','PAYMENT_RECEIVED')
    and coalesce(pe.amount, 0) > 0;
$$;

-- 1. Visão geral ------------------------------------------------------------
create or replace function public.get_marketing_overview(_days integer default 30)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := now() - (_days || ' days')::interval;
  _result json;
begin
  perform public.mkt_guard();

  with pay as (
    select * from public.mkt_payments()
    where user_id is null or not public.mkt_is_internal(user_id)
  ),
  first_pay as (
    select email, min(paid_at) as first_paid_at from pay group by email
  ),
  window_pay as (
    select * from pay where paid_at >= _from
  )
  select json_build_object(
    'period_days', _days,
    'period_start', _from,
    'new_members', (
      select count(*) from public.profiles p
      where p.created_at >= _from and not public.mkt_is_internal(p.user_id)
    ),
    'total_members', (
      select count(*) from public.profiles p where not public.mkt_is_internal(p.user_id)
    ),
    'active_members', (
      select count(*) from public.profiles p
      where p.subscription_status = 'active' and not public.mkt_is_internal(p.user_id)
    ),
    'first_payments', (
      select count(*) from first_pay where first_paid_at >= _from
    ),
    'new_revenue', (
      select coalesce(sum(w.amount), 0) from window_pay w
      join first_pay f on f.email = w.email and f.first_paid_at = w.paid_at
    ),
    'total_revenue', (select coalesce(sum(amount), 0) from window_pay),
    'payments_count', (select count(*) from window_pay),
    'unique_payers', (select count(distinct email) from window_pay),
    'avg_ticket', (select coalesce(round(avg(amount), 2), 0) from window_pay),
    'upgrades', (
      select count(*) from public.plan_upgrades pu
      where pu.paid_at is not null and pu.paid_at >= _from
    ),
    'cancellations', (
      select count(*) from public.profiles p
      where p.subscription_status in ('expired','refunded')
        and p.updated_at >= _from
        and not public.mkt_is_internal(p.user_id)
    ),
    'lifetime_revenue', (select coalesce(sum(amount), 0) from pay),
    'ltv_avg', (
      select case when count(distinct email) = 0 then 0
             else round(sum(amount) / count(distinct email), 2) end
      from pay
    )
  ) into _result;

  return _result;
end;
$$;

-- 2. Aquisição --------------------------------------------------------------
create or replace function public.get_marketing_acquisition(_days integer default 0)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := case when _days > 0 then now() - (_days || ' days')::interval else '-infinity'::timestamptz end;
  _result json;
begin
  perform public.mkt_guard();

  with members as (
    select p.user_id, p.created_at
    from public.profiles p
    where p.created_at >= _from and not public.mkt_is_internal(p.user_id)
  ),
  emails as (select * from public.mkt_member_emails()),
  rev as (
    select e.user_id, coalesce(sum(pay.amount), 0) as revenue
    from members m
    join emails e on e.user_id = m.user_id
    left join public.mkt_payments() pay on pay.email = e.email
    group by e.user_id
  ),
  base as (
    select m.user_id,
           coalesce(a.source_type, 'unknown') as source_type,
           coalesce(nullif(a.utm_source, ''), 'none') as utm_source,
           coalesce(nullif(a.utm_medium, ''), 'none') as utm_medium,
           coalesce(nullif(a.utm_campaign, ''), 'none') as utm_campaign,
           coalesce(nullif(a.referrer, ''), 'none') as referrer,
           coalesce(nullif(a.landing_page, ''), 'none') as landing_page,
           coalesce(r.revenue, 0) as revenue,
           (a.user_id is not null) as has_attribution
    from members m
    left join public.member_attribution a on a.user_id = m.user_id
    left join rev r on r.user_id = m.user_id
  ),
  grp as (
    select 'source_type' as dimension, source_type as value, count(*) as members, sum(revenue) as revenue from base group by source_type
    union all
    select 'utm_source', utm_source, count(*), sum(revenue) from base group by utm_source
    union all
    select 'utm_medium', utm_medium, count(*), sum(revenue) from base group by utm_medium
    union all
    select 'utm_campaign', utm_campaign, count(*), sum(revenue) from base group by utm_campaign
    union all
    select 'referrer', referrer, count(*), sum(revenue) from base group by referrer
    union all
    select 'landing_page', landing_page, count(*), sum(revenue) from base group by landing_page
  )
  select json_build_object(
    'period_days', _days,
    'members_total', (select count(*) from base),
    'members_with_attribution', (select count(*) from base where has_attribution),
    'attribution_coverage_pct', (
      select case when count(*) = 0 then 0
             else round(100.0 * count(*) filter (where has_attribution) / count(*), 1) end
      from base
    ),
    'groups', coalesce((
      select json_agg(json_build_object(
        'dimension', dimension, 'value', value,
        'members', members, 'revenue', revenue
      ) order by dimension, members desc)
      from grp
    ), '[]'::json)
  ) into _result;

  return _result;
end;
$$;

-- 3. Funil ------------------------------------------------------------------
create or replace function public.get_marketing_funnel(_days integer default 0)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := case when _days > 0 then now() - (_days || ' days')::interval else '-infinity'::timestamptz end;
  _result json;
begin
  perform public.mkt_guard();

  with members as (
    select p.user_id from public.profiles p
    where p.created_at >= _from and not public.mkt_is_internal(p.user_id)
  ),
  emails as (select * from public.mkt_member_emails()),
  steps as (
    select
      count(*) as signups,
      count(*) filter (where exists (select 1 from public.user_onboarding o where o.user_id = m.user_id)) as onboarding_started,
      count(*) filter (where exists (select 1 from public.user_onboarding o where o.user_id = m.user_id and o.completed_at is not null)) as onboarding_completed,
      count(*) filter (where exists (select 1 from public.member_analytics a where a.user_id = m.user_id)) as first_access,
      count(*) filter (where exists (
        select 1 from emails e join public.mkt_payments() pay on pay.email = e.email
        where e.user_id = m.user_id
      )) as paid,
      count(*) filter (where exists (
        select 1 from public.member_analytics a
        where a.user_id = m.user_id and a.created_at >= now() - interval '7 days'
      )) as active_7d
    from members m
  )
  select json_build_object(
    'period_days', _days,
    'steps', json_build_array(
      json_build_object('step', 'signup', 'label', 'Cadastro', 'count', signups),
      json_build_object('step', 'onboarding_started', 'label', 'Onboarding iniciado', 'count', onboarding_started),
      json_build_object('step', 'onboarding_completed', 'label', 'Onboarding concluído', 'count', onboarding_completed),
      json_build_object('step', 'first_access', 'label', 'Primeiro acesso', 'count', first_access),
      json_build_object('step', 'first_payment', 'label', 'Primeiro pagamento', 'count', paid),
      json_build_object('step', 'active_7d', 'label', 'Ativo nos últimos 7 dias', 'count', active_7d)
    )
  ) into _result from steps;

  return _result;
end;
$$;

-- 4. Coortes ----------------------------------------------------------------
create or replace function public.get_marketing_cohorts()
returns table(
  cohort_month date,
  members bigint,
  paying_members bigint,
  revenue numeric,
  still_active bigint,
  active_7d bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.mkt_guard();

  return query
  with members as (
    select p.user_id, p.created_at, p.subscription_status
    from public.profiles p
    where not public.mkt_is_internal(p.user_id)
  ),
  emails as (select * from public.mkt_member_emails()),
  enriched as (
    select m.*, e.email,
      coalesce((select sum(pay.amount) from public.mkt_payments() pay where pay.email = e.email), 0) as rev
    from members m left join emails e on e.user_id = m.user_id
  )
  select date_trunc('month', created_at)::date,
         count(*),
         count(*) filter (where rev > 0),
         coalesce(sum(rev), 0),
         count(*) filter (where subscription_status = 'active'),
         count(*) filter (where exists (
           select 1 from public.member_analytics a
           where a.user_id = enriched.user_id and a.created_at >= now() - interval '7 days'
         ))
  from enriched
  group by 1
  order by 1;
end;
$$;

-- 5. Série de receita -------------------------------------------------------
create or replace function public.get_marketing_revenue_timeseries(
  _days integer default 180,
  _granularity text default 'day'
)
returns table(
  bucket date,
  revenue numeric,
  payments bigint,
  unique_payers bigint,
  new_payers bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := now() - (_days || ' days')::interval;
  _unit text := case when _granularity = 'month' then 'month' else 'day' end;
begin
  perform public.mkt_guard();

  return query
  with pay as (
    select * from public.mkt_payments()
    where user_id is null or not public.mkt_is_internal(user_id)
  ),
  first_pay as (select email, min(paid_at) as first_paid_at from pay group by email)
  select date_trunc(_unit, p.paid_at)::date,
         coalesce(sum(p.amount), 0),
         count(*),
         count(distinct p.email),
         count(distinct p.email) filter (where f.first_paid_at = p.paid_at)
  from pay p
  join first_pay f on f.email = p.email
  where p.paid_at >= _from
  group by 1
  order by 1;
end;
$$;

-- 6. ICP (onboarding) -------------------------------------------------------
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
    union all select 'uses_erp', case when uses_erp is null then 'não informado' when uses_erp then 'sim' else 'não' end from base
    union all select 'uses_ai', case when uses_ai is null then 'não informado' when uses_ai then 'sim' else 'não' end from base
    union all select 'uses_accounting', case when uses_accounting is null then 'não informado' when uses_accounting then 'sim' else 'não' end from base
    union all select 'has_supplier_difficulty', case when has_supplier_difficulty is null then 'não informado' when has_supplier_difficulty then 'sim' else 'não' end from base
    union all select 'city_state', coalesce(nullif(city_state,''),'não informado') from base
  ),
  array_dims as (
    select 'business_models' as dimension, unnest(coalesce(business_models, '{}')) as value from base
    union all select 'sales_channels', unnest(coalesce(sales_channels, '{}')) from base
    union all select 'erp_tools', unnest(coalesce(erp_tools, '{}')) from base
    union all select 'ai_tools', unnest(coalesce(ai_tools, '{}')) from base
    union all select 'supplier_needs', unnest(coalesce(supplier_needs, '{}')) from base
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

-- 7. Planos -----------------------------------------------------------------
create or replace function public.get_marketing_plans()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare _result json;
begin
  perform public.mkt_guard();

  with members as (
    select p.user_id, lower(coalesce(p.subscription_plan,'sem plano')) as plan, p.subscription_status
    from public.profiles p where not public.mkt_is_internal(p.user_id)
  ),
  emails as (select * from public.mkt_member_emails()),
  rev as (
    select m.plan, coalesce(sum(pay.amount), 0) as revenue
    from members m
    left join emails e on e.user_id = m.user_id
    left join public.mkt_payments() pay on pay.email = e.email
    group by m.plan
  ),
  mix as (
    select m.plan, m.subscription_status, count(*) as members
    from members m group by 1, 2
  ),
  transitions as (
    select lower(coalesce(current_plan,'-')) as from_plan,
           lower(coalesce(new_plan,'-')) as to_plan,
           count(*) as total,
           coalesce(sum(upgrade_amount), 0) as amount
    from public.plan_upgrades
    group by 1, 2
  )
  select json_build_object(
    'mix', coalesce((select json_agg(json_build_object('plan', plan, 'status', subscription_status, 'members', members) order by members desc) from mix), '[]'::json),
    'revenue_by_plan', coalesce((select json_agg(json_build_object('plan', plan, 'revenue', revenue) order by revenue desc) from rev), '[]'::json),
    'transitions', coalesce((select json_agg(json_build_object('from_plan', from_plan, 'to_plan', to_plan, 'count', total, 'amount', amount) order by total desc) from transitions), '[]'::json)
  ) into _result;

  return _result;
end;
$$;

-- 8. Parceiros --------------------------------------------------------------
create or replace function public.get_marketing_partners(_days integer default 0)
returns table(
  partner_name text,
  benefit_type text,
  clicks bigint,
  unique_users bigint,
  purchases bigint,
  purchase_value numeric,
  cashback_value numeric,
  utm_sources text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := case when _days > 0 then now() - (_days || ' days')::interval else '-infinity'::timestamptz end;
begin
  perform public.mkt_guard();

  return query
  select pc.partner_name,
         coalesce(pc.benefit_type, 'n/d'),
         count(*),
         count(distinct pc.user_id),
         count(*) filter (where coalesce(pc.purchase_value, 0) > 0),
         coalesce(sum(pc.purchase_value), 0),
         coalesce(sum(pc.cashback_value), 0),
         string_agg(distinct coalesce(pc.utm_source, 'none'), ', ')
  from public.partner_clicks pc
  where pc.clicked_at >= _from and not public.mkt_is_internal(pc.user_id)
  group by 1, 2
  order by 3 desc;
end;
$$;

-- 9. Vendedores / afiliados -------------------------------------------------
create or replace function public.get_marketing_sellers(_days integer default 0)
returns table(
  seller_name text,
  seller_slug text,
  seller_status text,
  sales bigint,
  gross_value numeric,
  commission_value numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := case when _days > 0 then now() - (_days || ' days')::interval else '-infinity'::timestamptz end;
begin
  perform public.mkt_guard();

  return query
  select v.nome, v.slug, v.status,
         count(s.id),
         coalesce(sum(s.valor), 0),
         coalesce(sum(s.comissao_valor), 0)
  from public.vendedores v
  left join public.vendas s on s.vendedor_id = v.id and s.created_at >= _from
  group by v.nome, v.slug, v.status
  order by 5 desc nulls last;
end;
$$;

-- 10. Interesse de conteúdo -------------------------------------------------
create or replace function public.get_marketing_content_interest(_days integer default 90)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := now() - (_days || ' days')::interval;
  _result json;
begin
  perform public.mkt_guard();

  with base as (
    select * from public.mapinha_interactions mi
    where mi.created_at >= _from and not public.mkt_is_internal(mi.user_id)
  ),
  topics as (
    select coalesce(nullif(topic,''),'sem tópico') as topic,
           count(*) as questions,
           count(distinct user_id) as unique_users,
           round(avg(rating)::numeric, 2) as avg_rating,
           sum(coalesce(web_search_count, 0)) as web_searches
    from base group by 1
  )
  select json_build_object(
    'period_days', _days,
    'questions_total', (select count(*) from base),
    'unique_users', (select count(distinct user_id) from base),
    'avg_rating', (select round(avg(rating)::numeric, 2) from base where rating is not null),
    'topics', coalesce((select json_agg(json_build_object(
        'topic', topic, 'questions', questions, 'unique_users', unique_users,
        'avg_rating', avg_rating, 'web_searches', web_searches) order by questions desc) from topics), '[]'::json)
  ) into _result;

  return _result;
end;
$$;

-- 11. Conversão de eventos --------------------------------------------------
create or replace function public.get_marketing_events_conversion(_days integer default 180)
returns table(
  event_kind text,
  event_id uuid,
  title text,
  scheduled_at timestamptz,
  checkins bigint,
  max_attendees integer,
  fill_rate numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _from timestamptz := now() - (_days || ' days')::interval;
begin
  perform public.mkt_guard();

  return query
  select 'webinar'::text, w.id, w.title, w.scheduled_at,
         count(c.id),
         w.max_attendees,
         case when coalesce(w.max_attendees, 0) > 0
              then round(100.0 * count(c.id) / w.max_attendees, 1) else null end
  from public.webinars w
  left join public.webinar_checkins c
    on c.webinar_id = w.id and not public.mkt_is_internal(c.user_id)
  where w.scheduled_at >= _from
  group by w.id, w.title, w.scheduled_at, w.max_attendees

  union all

  select 'mentoria'::text, m.id, m.title, m.scheduled_at,
         count(mc.id),
         m.max_attendees,
         case when coalesce(m.max_attendees, 0) > 0
              then round(100.0 * count(mc.id) / m.max_attendees, 1) else null end
  from public.mentoring_sessions m
  left join public.mentoring_checkins mc
    on mc.session_id = m.id and not public.mkt_is_internal(mc.user_id)
  where m.scheduled_at >= _from
  group by m.id, m.title, m.scheduled_at, m.max_attendees
  order by 4 desc;
end;
$$;

-- 12. Geografia -------------------------------------------------------------
create or replace function public.get_marketing_geo()
returns table(
  city_state text,
  members bigint,
  paying_members bigint,
  revenue numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.mkt_guard();

  return query
  with base as (
    select o.user_id, coalesce(nullif(o.city_state,''),'não informado') as loc
    from public.user_onboarding o
    where not public.mkt_is_internal(o.user_id)
  ),
  emails as (select * from public.mkt_member_emails()),
  enriched as (
    select b.loc, b.user_id,
      coalesce((select sum(pay.amount) from public.mkt_payments() pay where pay.email = e.email), 0) as rev
    from base b left join emails e on e.user_id = b.user_id
  )
  select loc, count(*), count(*) filter (where rev > 0), coalesce(sum(rev), 0)
  from enriched group by 1 order by 2 desc;
end;
$$;

-- Permissões ---------------------------------------------------------------
revoke all on function public.mkt_guard() from public, anon, authenticated;
revoke all on function public.mkt_is_internal(uuid) from public, anon;
revoke all on function public.mkt_member_emails() from public, anon, authenticated;
revoke all on function public.mkt_payments() from public, anon, authenticated;

grant execute on function public.mkt_is_internal(uuid) to authenticated, service_role;
grant execute on function public.mkt_guard() to authenticated, service_role;
grant execute on function public.mkt_member_emails() to service_role;
grant execute on function public.mkt_payments() to service_role;

grant execute on function public.get_marketing_overview(integer) to authenticated, service_role;
grant execute on function public.get_marketing_acquisition(integer) to authenticated, service_role;
grant execute on function public.get_marketing_funnel(integer) to authenticated, service_role;
grant execute on function public.get_marketing_cohorts() to authenticated, service_role;
grant execute on function public.get_marketing_revenue_timeseries(integer, text) to authenticated, service_role;
grant execute on function public.get_onboarding_icp_distribution() to authenticated, service_role;
grant execute on function public.get_marketing_plans() to authenticated, service_role;
grant execute on function public.get_marketing_partners(integer) to authenticated, service_role;
grant execute on function public.get_marketing_sellers(integer) to authenticated, service_role;
grant execute on function public.get_marketing_content_interest(integer) to authenticated, service_role;
grant execute on function public.get_marketing_events_conversion(integer) to authenticated, service_role;
grant execute on function public.get_marketing_geo() to authenticated, service_role;