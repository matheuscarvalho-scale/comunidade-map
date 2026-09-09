
-- Step 1: Drop ALL policies on tables that have role columns or reference app_role/has_role/has_permission
DO $$
DECLARE r RECORD;
BEGIN
  -- Drop ALL policies on user_roles and role_permissions (they have role columns)
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('user_roles','role_permissions')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename); END LOOP;
  -- Drop all policies referencing app_role, has_role, has_permission
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE (qual::text LIKE '%app_role%' OR qual::text LIKE '%has_role%' OR qual::text LIKE '%has_permission%'
       OR with_check::text LIKE '%app_role%' OR with_check::text LIKE '%has_role%' OR with_check::text LIKE '%has_permission%'
       OR (tablename = 'permissions' AND qual::text LIKE '%role_permissions%'))
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename); END LOOP;
END $$;

-- Step 2: Drop functions
DROP FUNCTION IF EXISTS public.has_permission(uuid, text);
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_highest_role(uuid);

-- Step 3: Drop defaults, convert to text
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.role_permissions ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text;
ALTER TABLE public.role_permissions ALTER COLUMN role TYPE text;

-- Step 4: Migrate data
DELETE FROM public.user_roles WHERE role = 'super_admin' AND user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin_geral');
UPDATE public.user_roles SET role = 'admin_geral' WHERE role = 'super_admin';
DELETE FROM public.user_roles WHERE role = 'cs' AND user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'cx');
UPDATE public.user_roles SET role = 'cx' WHERE role = 'cs';
DELETE FROM public.role_permissions WHERE role IN ('super_admin', 'cs');

-- Step 5: Drop/recreate enum
DROP TYPE public.app_role;
CREATE TYPE public.app_role AS ENUM ('admin_geral','admin','admin_financeiro','admin_conteudo','starter','pro','enterprise','automacao','cx','comercial','marketing');
ALTER TABLE public.user_roles ALTER COLUMN role TYPE app_role USING role::app_role;
ALTER TABLE public.role_permissions ALTER COLUMN role TYPE app_role USING role::app_role;
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'starter'::app_role;
ALTER TABLE public.role_permissions ALTER COLUMN role SET DEFAULT 'starter'::app_role;

-- Step 6: Recreate functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND (role = _role OR role = 'admin_geral')) $$;
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_user_id uuid) RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY CASE role WHEN 'admin_geral' THEN 1 WHEN 'admin' THEN 2 WHEN 'admin_financeiro' THEN 3 WHEN 'admin_conteudo' THEN 4 WHEN 'cx' THEN 5 WHEN 'comercial' THEN 6 WHEN 'marketing' THEN 7 WHEN 'automacao' THEN 8 WHEN 'enterprise' THEN 9 WHEN 'pro' THEN 10 WHEN 'starter' THEN 11 ELSE 99 END LIMIT 1 $$;
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role = ur.role JOIN public.permissions p ON p.id = rp.permission_id WHERE ur.user_id = _user_id AND p.name = _permission_name) $$;

-- Step 7: Recreate all policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view own role permissions" ON public.role_permissions FOR SELECT USING (role IN (SELECT ur.role FROM user_roles ur WHERE ur.user_id = auth.uid()));
CREATE POLICY "Admins can view role_permissions" ON public.role_permissions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Admin geral can manage role_permissions" ON public.role_permissions FOR ALL USING (has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Authenticated users can view own permissions" ON public.permissions FOR SELECT USING (id IN (SELECT rp.permission_id FROM role_permissions rp JOIN user_roles ur ON ur.role = rp.role WHERE ur.user_id = auth.uid()));
CREATE POLICY "Admins can view permissions" ON public.permissions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Admin geral can manage permissions" ON public.permissions FOR ALL USING (has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Admins can view all analytics" ON public.member_analytics FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all checkins" ON public.webinar_checkins FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete webinar checkins" ON public.webinar_checkins FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage sessions" ON public.mentoring_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all checkins" ON public.mentoring_checkins FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert checkins" ON public.mentoring_checkins FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete checkins" ON public.mentoring_checkins FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all requests" ON public.secondary_login_requests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update requests" ON public.secondary_login_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage secondary logins" ON public.secondary_logins FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage updates" ON public.platform_updates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage content tracks" ON public.content_tracks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage content items" ON public.content_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage mentors" ON public.mentors FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all cashback usage" ON public.cashback_usage FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all cashback usage" ON public.cashback_usage FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert partners" ON public.partners FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update partners" ON public.partners FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete partners" ON public.partners FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert webhook logs" ON public.webhook_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all suggestions" ON public.suggestions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete suggestions" ON public.suggestions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any reply" ON public.post_replies FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage scarcity config" ON public.webinar_scarcity_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all terms acceptance" ON public.terms_acceptance FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete resources" ON public.resources FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Admins can insert resources" ON public.resources FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Admins can update resources" ON public.resources FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Admins can manage formations" ON public.formations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_role(auth.uid(), 'admin_conteudo'::app_role));
CREATE POLICY "Admins can manage formation lessons" ON public.formation_lessons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_role(auth.uid(), 'admin_conteudo'::app_role));
CREATE POLICY "Admins can manage formation modules" ON public.formation_modules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR has_role(auth.uid(), 'admin_conteudo'::app_role));
CREATE POLICY "Managers can manage feature toggles by feature" ON public.feature_toggles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR ((feature_key = 'formacoes') AND has_permission(auth.uid(), 'formations.manage')) OR ((feature_key = 'trilha-conteudo') AND has_permission(auth.uid(), 'formations.manage')) OR ((feature_key = 'webinars') AND has_permission(auth.uid(), 'webinars.manage')) OR ((feature_key = 'mentorias') AND has_permission(auth.uid(), 'mentorias.manage'))) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role) OR ((feature_key = 'formacoes') AND has_permission(auth.uid(), 'formations.manage')) OR ((feature_key = 'trilha-conteudo') AND has_permission(auth.uid(), 'formations.manage')) OR ((feature_key = 'webinars') AND has_permission(auth.uid(), 'webinars.manage')) OR ((feature_key = 'mentorias') AND has_permission(auth.uid(), 'mentorias.manage')));
CREATE POLICY "Admins can view all onboarding" ON public.user_onboarding FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage vendedores" ON public.vendedores FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage vendas" ON public.vendas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update notifications" ON public.notifications FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read all clicks" ON public.partner_clicks FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all clicks" ON public.partner_clicks FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage payment_events" ON public.payment_events FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage pending_payments" ON public.pending_payments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage conta_azul_tokens" ON public.conta_azul_tokens FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins full access on cloudflare_videos" ON public.cloudflare_videos FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all video progress" ON public.video_progress FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage all reminders" ON public.webinar_email_reminders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Admins can update reminders" ON public.webinar_email_reminders FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_geral'::app_role));
CREATE POLICY "Users with webinars.manage can manage webinars" ON public.webinars FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_permission(auth.uid(), 'webinars.manage'));
CREATE POLICY "Admins can upload partner logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update partner logos" ON storage.objects FOR UPDATE USING (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete partner logos" ON storage.objects FOR DELETE USING (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all cashback proofs" ON storage.objects FOR SELECT USING (bucket_id = 'cashback-proofs' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can upload webinar thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'webinar-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete webinar thumbnails" ON storage.objects FOR DELETE USING (bucket_id = 'webinar-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can upload formation thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'formation-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete formation thumbnails" ON storage.objects FOR DELETE USING (bucket_id = 'formation-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update formation thumbnails" ON storage.objects FOR UPDATE USING (bucket_id = 'formation-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins and marketing can upload formation videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'formation-videos' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role)));
CREATE POLICY "Admins and marketing can update formation videos" ON storage.objects FOR UPDATE USING (bucket_id = 'formation-videos' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role)));
CREATE POLICY "Admins and marketing can delete formation videos" ON storage.objects FOR DELETE USING (bucket_id = 'formation-videos' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'marketing'::app_role)));
