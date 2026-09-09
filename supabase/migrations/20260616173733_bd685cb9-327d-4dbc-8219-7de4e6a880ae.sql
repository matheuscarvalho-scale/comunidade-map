
DROP POLICY IF EXISTS "Admins can upload dona-olga media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read dona-olga media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete dona-olga media" ON storage.objects;

CREATE POLICY "Dona Olga upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dona-olga-media'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'admin_geral'::app_role)
    OR auth.uid() = '44059506-de82-41e6-afd1-39bb3d7589c7'::uuid
  )
);

CREATE POLICY "Dona Olga read media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dona-olga-media'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'admin_geral'::app_role)
    OR auth.uid() = '44059506-de82-41e6-afd1-39bb3d7589c7'::uuid
  )
);

CREATE POLICY "Dona Olga delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dona-olga-media'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'admin_geral'::app_role)
    OR auth.uid() = '44059506-de82-41e6-afd1-39bb3d7589c7'::uuid
  )
);
