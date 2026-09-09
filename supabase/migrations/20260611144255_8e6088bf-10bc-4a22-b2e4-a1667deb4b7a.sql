
CREATE POLICY "Admins can upload dona-olga media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dona-olga-media'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_geral'))
);

CREATE POLICY "Admins can read dona-olga media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dona-olga-media'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_geral'))
);

CREATE POLICY "Admins can delete dona-olga media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'dona-olga-media'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_geral'))
);
