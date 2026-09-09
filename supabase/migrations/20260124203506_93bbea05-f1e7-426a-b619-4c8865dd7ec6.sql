-- Fix security: Restrict profile viewing to own profile + basic public info for networking
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Policy 1: Users can always view their own complete profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Allow viewing basic non-sensitive profile info for networking purposes
-- This creates a more restrictive view - users can see others' name and avatar only
-- for community features, but not sensitive data like location, bio, social links
CREATE POLICY "Users can view basic profile info for networking"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

-- Note: The above policy still allows SELECT but the application should only
-- query and display necessary fields. For maximum security, we'll use a view approach.

-- Actually, let's use a more secure approach with column-level security simulation
-- by keeping the policy but ensuring the app only exposes safe fields

-- Better approach: Keep restrictive and let admins have full access
DROP POLICY IF EXISTS "Users can view basic profile info for networking" ON public.profiles;

-- Final secure policies:
-- 1. Own profile - full access
-- Policy "Users can view own profile" already created above

-- 2. Admins can view all profiles for management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 3. For networking/community features - limited profile visibility
-- Only allow viewing profiles of users you follow or who follow you
CREATE POLICY "Users can view connected profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.member_connections
    WHERE (follower_id = auth.uid() AND following_id = profiles.user_id)
       OR (following_id = auth.uid() AND follower_id = profiles.user_id)
  )
);