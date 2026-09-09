
-- PASSO 1: Dropar TODAS as policies que dependem de has_role
-- user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
-- webhook_logs
DROP POLICY IF EXISTS "Admins can view webhook logs" ON webhook_logs;
DROP POLICY IF EXISTS "Admins can insert webhook logs" ON webhook_logs;
-- partners
DROP POLICY IF EXISTS "Admins can insert partners" ON partners;
DROP POLICY IF EXISTS "Admins can update partners" ON partners;
DROP POLICY IF EXISTS "Admins can delete partners" ON partners;
-- cashback_usage
DROP POLICY IF EXISTS "Admins can view all cashback usage" ON cashback_usage;
DROP POLICY IF EXISTS "Admins can update all cashback usage" ON cashback_usage;
-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
-- member_analytics
DROP POLICY IF EXISTS "Admins can view all analytics" ON member_analytics;
-- webinars
DROP POLICY IF EXISTS "Admins can manage webinars" ON webinars;
-- webinar_checkins
DROP POLICY IF EXISTS "Admins can view all checkins" ON webinar_checkins;
-- mentoring_sessions
DROP POLICY IF EXISTS "Admins can manage sessions" ON mentoring_sessions;
-- mentoring_checkins
DROP POLICY IF EXISTS "Admins can view all checkins" ON mentoring_checkins;
-- secondary_login_requests
DROP POLICY IF EXISTS "Admins can view all requests" ON secondary_login_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON secondary_login_requests;
-- secondary_logins
DROP POLICY IF EXISTS "Admins can manage secondary logins" ON secondary_logins;
-- platform_updates
DROP POLICY IF EXISTS "Admins can manage updates" ON platform_updates;
-- content_tracks
DROP POLICY IF EXISTS "Admins can manage content tracks" ON content_tracks;
-- content_items
DROP POLICY IF EXISTS "Admins can manage content items" ON content_items;
-- mentors
DROP POLICY IF EXISTS "Admins can manage mentors" ON mentors;
-- permissions
DROP POLICY IF EXISTS "Admins can view permissions" ON permissions;
DROP POLICY IF EXISTS "Super admins can manage permissions" ON permissions;
-- role_permissions
DROP POLICY IF EXISTS "Admins can view role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Super admins can manage role_permissions" ON role_permissions;
-- audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
-- webinar_email_reminders
DROP POLICY IF EXISTS "Admins can manage all reminders" ON webinar_email_reminders;
DROP POLICY IF EXISTS "Service role can update reminders" ON webinar_email_reminders;
-- formations
DROP POLICY IF EXISTS "Admins can manage formations" ON formations;
-- formation_modules
DROP POLICY IF EXISTS "Admins can manage formation modules" ON formation_modules;
-- formation_lessons
DROP POLICY IF EXISTS "Admins can manage formation lessons" ON formation_lessons;
-- Storage policies
DROP POLICY IF EXISTS "Admins can upload partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all cashback proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload webinar thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete webinar thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload formation thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete formation thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update formation thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload formation videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete formation videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update formation videos" ON storage.objects;

-- PASSO 2: Dropar funções
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.has_permission(uuid, text);

-- PASSO 3: Salvar dados e dropar colunas
CREATE TEMP TABLE tmp_user_roles AS SELECT id, user_id, role::text as role, created_at, assigned_by, updated_at FROM user_roles;
CREATE TEMP TABLE tmp_role_permissions AS SELECT id, role::text as role, permission_id, created_at FROM role_permissions;
ALTER TABLE user_roles DROP COLUMN role;
ALTER TABLE role_permissions DROP COLUMN role;

-- PASSO 4: Dropar tipo antigo e criar novo
DROP TYPE app_role;
CREATE TYPE app_role AS ENUM ('admin','super_admin','admin_financeiro','admin_conteudo','starter','pro','mapa_de_map','automacao');

-- PASSO 5: Readicionar colunas
ALTER TABLE user_roles ADD COLUMN role app_role NOT NULL DEFAULT 'starter';
ALTER TABLE role_permissions ADD COLUMN role app_role NOT NULL DEFAULT 'starter';

-- PASSO 6: Restaurar dados
UPDATE user_roles SET role = t.role::app_role FROM tmp_user_roles t WHERE user_roles.id = t.id;
UPDATE role_permissions SET role = t.role::app_role FROM tmp_role_permissions t WHERE role_permissions.id = t.id;
DROP TABLE tmp_user_roles;
DROP TABLE tmp_role_permissions;

-- PASSO 7: Recriar funções
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND (role = _role OR role = 'super_admin')) $$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role = ur.role JOIN public.permissions p ON p.id = rp.permission_id WHERE ur.user_id = _user_id AND p.name = _permission_name) $$;

-- PASSO 8: Recriar TODAS as policies
CREATE POLICY "Admins can view all roles" ON user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all analytics" ON member_analytics FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage webinars" ON webinars FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all checkins" ON webinar_checkins FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage sessions" ON mentoring_sessions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all checkins" ON mentoring_checkins FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all requests" ON secondary_login_requests FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update requests" ON secondary_login_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage secondary logins" ON secondary_logins FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage updates" ON platform_updates FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage content tracks" ON content_tracks FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage content items" ON content_items FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage mentors" ON mentors FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all cashback usage" ON cashback_usage FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all cashback usage" ON cashback_usage FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert partners" ON partners FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update partners" ON partners FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete partners" ON partners FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view webhook logs" ON webhook_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert webhook logs" ON webhook_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view permissions" ON permissions FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can manage permissions" ON permissions FOR ALL USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can view role_permissions" ON role_permissions FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can manage role_permissions" ON role_permissions FOR ALL USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage all reminders" ON webinar_email_reminders FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role can update reminders" ON webinar_email_reminders FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage formations" ON formations FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo'));
CREATE POLICY "Admins can manage formation modules" ON formation_modules FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo'));
CREATE POLICY "Admins can manage formation lessons" ON formation_lessons FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo'));
-- Storage
CREATE POLICY "Admins can upload partner logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update partner logos" ON storage.objects FOR UPDATE USING (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete partner logos" ON storage.objects FOR DELETE USING (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all cashback proofs" ON storage.objects FOR SELECT USING (bucket_id = 'cashback-proofs' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload webinar thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'webinar-thumbnails' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete webinar thumbnails" ON storage.objects FOR DELETE USING (bucket_id = 'webinar-thumbnails' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload formation thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'formation-thumbnails' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_conteudo')));
CREATE POLICY "Admins can delete formation thumbnails" ON storage.objects FOR DELETE USING (bucket_id = 'formation-thumbnails' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_conteudo')));
CREATE POLICY "Admins can update formation thumbnails" ON storage.objects FOR UPDATE USING (bucket_id = 'formation-thumbnails' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_conteudo')));
CREATE POLICY "Admins can upload formation videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'formation-videos' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_conteudo')));
CREATE POLICY "Admins can delete formation videos" ON storage.objects FOR DELETE USING (bucket_id = 'formation-videos' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_conteudo')));
CREATE POLICY "Admins can update formation videos" ON storage.objects FOR UPDATE USING (bucket_id = 'formation-videos' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_conteudo')));
