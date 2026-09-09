
-- Update storage policies to include CX role
DROP POLICY IF EXISTS "Admins can upload member documents" ON storage.objects;
CREATE POLICY "Admins and CX can upload member documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cx'))
);

DROP POLICY IF EXISTS "Admins can view member documents" ON storage.objects;
CREATE POLICY "Admins and CX can view member documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cx'))
);

DROP POLICY IF EXISTS "Admins can delete member documents" ON storage.objects;
CREATE POLICY "Admins and CX can delete member documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cx'))
);

DROP POLICY IF EXISTS "Admins can update member documents" ON storage.objects;
CREATE POLICY "Admins and CX can update member documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cx'))
);
