-- Replace feature toggles management policy to allow module-specific managers
DROP POLICY IF EXISTS "Admins can manage feature toggles" ON public.feature_toggles;

CREATE POLICY "Managers can manage feature toggles by feature"
ON public.feature_toggles
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'admin_geral'::app_role)
  OR (feature_key = 'formacoes' AND has_permission(auth.uid(), 'formations.manage'))
  OR (feature_key = 'trilha-conteudo' AND has_permission(auth.uid(), 'formations.manage'))
  OR (feature_key = 'webinars' AND has_permission(auth.uid(), 'webinars.manage'))
  OR (feature_key = 'mentorias' AND has_permission(auth.uid(), 'mentorias.manage'))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'admin_geral'::app_role)
  OR (feature_key = 'formacoes' AND has_permission(auth.uid(), 'formations.manage'))
  OR (feature_key = 'trilha-conteudo' AND has_permission(auth.uid(), 'formations.manage'))
  OR (feature_key = 'webinars' AND has_permission(auth.uid(), 'webinars.manage'))
  OR (feature_key = 'mentorias' AND has_permission(auth.uid(), 'mentorias.manage'))
);