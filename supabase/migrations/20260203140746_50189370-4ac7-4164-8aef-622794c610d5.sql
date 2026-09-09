-- Create resources bucket for file storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to resources bucket
CREATE POLICY "Public read access for resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'resources');

-- Allow authenticated users to upload files (for admin purposes)
CREATE POLICY "Authenticated users can upload resources"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resources' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update resources"
ON storage.objects FOR UPDATE
USING (bucket_id = 'resources' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete resources
CREATE POLICY "Authenticated users can delete resources"
ON storage.objects FOR DELETE
USING (bucket_id = 'resources' AND auth.role() = 'authenticated');