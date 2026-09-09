-- profiles
ALTER POLICY "Admins can view all profiles" ON public.profiles
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'subscriptions.manage'));
ALTER POLICY "Admins can update any profile" ON public.profiles
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'subscriptions.manage'));
ALTER POLICY "Only admins can delete profiles" ON public.profiles
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));

-- payment_identifiers
ALTER POLICY "Admins full access on payment_identifiers" ON public.payment_identifiers
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'subscriptions.manage'))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'subscriptions.manage'));

-- user_onboarding
ALTER POLICY "Admins can view all onboarding" ON public.user_onboarding
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'subscriptions.manage'));

-- cashback_usage
ALTER POLICY "Admins can view all cashback usage" ON public.cashback_usage
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'cashback.manage'));
ALTER POLICY "Admins can update all cashback usage" ON public.cashback_usage
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'cashback.manage'));

-- partner_clicks
ALTER POLICY "Admins can read all clicks" ON public.partner_clicks
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'cashback.manage'));
ALTER POLICY "Admins can update all clicks" ON public.partner_clicks
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'cashback.manage'));

-- member_analytics
ALTER POLICY "Admins can view all analytics" ON public.member_analytics
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_permission(auth.uid(), 'analytics.manage'));