DO $$
DECLARE
  fn text;
  def text;
  newdef text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'get_analytics_kpis','get_engagement_stats','get_page_views_over_time',
    'get_weekday_access_summary','get_access_heatmap','get_top_pages_by_views',
    'get_top_clicked_elements','get_page_click_details','get_formation_completion_rates',
    'get_inactive_members','get_onboarding_responses','get_cashback_dashboard_stats',
    'get_cashback_partner_performance','get_cashback_saldo_planos'
  ]
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = fn
     LIMIT 1;

    IF def IS NULL THEN
      CONTINUE;
    END IF;

    newdef := replace(
      def,
      'IF NOT (public.has_role(',
      'IF NOT (auth.role() = ''service_role'' OR public.has_role('
    );

    IF newdef <> def THEN
      EXECUTE newdef;
    END IF;
  END LOOP;
END;
$$;