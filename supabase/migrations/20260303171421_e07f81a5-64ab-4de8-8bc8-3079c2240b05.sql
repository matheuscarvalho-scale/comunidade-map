-- Allow marketing users to manage formation videos in storage (same as admin_conteudo flow)
DROP POLICY IF EXISTS "Admins can upload formation videos" ON storage.objects;
CREATE POLICY "Admins and marketing can upload formation videos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'formation-videos'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'admin_conteudo'::public.app_role)
    OR has_role(auth.uid(), 'marketing'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Admins can update formation videos" ON storage.objects;
CREATE POLICY "Admins and marketing can update formation videos"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'formation-videos'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'admin_conteudo'::public.app_role)
    OR has_role(auth.uid(), 'marketing'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Admins can delete formation videos" ON storage.objects;
CREATE POLICY "Admins and marketing can delete formation videos"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'formation-videos'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'admin_conteudo'::public.app_role)
    OR has_role(auth.uid(), 'marketing'::public.app_role)
  )
);