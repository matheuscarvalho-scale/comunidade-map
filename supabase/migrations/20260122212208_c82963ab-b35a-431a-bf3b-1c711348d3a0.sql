-- Phase 1: Critical Security Fixes

-- 1.1 Restrict profile access to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- 1.2 Restrict post likes access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
CREATE POLICY "Authenticated users can view likes" 
ON public.post_likes FOR SELECT 
TO authenticated 
USING (true);

-- 1.3 Restrict achievements access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Authenticated users can view achievements" 
ON public.achievements FOR SELECT 
TO authenticated 
USING (true);

-- 1.4 Restrict courses access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
CREATE POLICY "Authenticated users can view courses" 
ON public.courses FOR SELECT 
TO authenticated 
USING (true);

-- 1.5 Restrict community posts access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view posts" ON public.community_posts;
CREATE POLICY "Authenticated users can view posts" 
ON public.community_posts FOR SELECT 
TO authenticated 
USING (true);

-- Phase 2: Configure Storage Limits for avatars bucket
UPDATE storage.buckets 
SET file_size_limit = 2097152, -- 2MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';