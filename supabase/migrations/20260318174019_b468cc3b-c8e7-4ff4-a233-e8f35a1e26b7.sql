
-- Create storage bucket for member documents (PDFs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-documents', 'member-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload files
CREATE POLICY "Admins can upload member documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to view files
CREATE POLICY "Admins can view member documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete member documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update files
CREATE POLICY "Admins can update member documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-documents'
  AND public.has_role(auth.uid(), 'admin')
);
