-- Create public bucket for partner logos (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true)
ON CONFLICT (id)
DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public;

-- Recreate policies for partner-logos bucket
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Partner logos are publicly accessible'
  ) THEN
    EXECUTE 'DROP POLICY "Partner logos are publicly accessible" ON storage.objects';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload partner logos'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can upload partner logos" ON storage.objects';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update partner logos'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can update partner logos" ON storage.objects';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete partner logos'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can delete partner logos" ON storage.objects';
  END IF;
END $$;

CREATE POLICY "Partner logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'partner-logos');

CREATE POLICY "Admins can upload partner logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-logos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update partner logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'partner-logos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete partner logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'partner-logos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
