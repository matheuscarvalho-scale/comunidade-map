
-- Make formation-videos bucket private (videos served via Cloudflare Stream JWT)
UPDATE storage.buckets SET public = false WHERE id = 'formation-videos';

-- Restrict email-assets uploads to admins only
DROP POLICY IF EXISTS "Admins can upload email assets" ON storage.objects;

CREATE POLICY "Admins can upload email assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-assets'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update email assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'email-assets'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete email assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-assets'
  AND has_role(auth.uid(), 'admin'::app_role)
);
