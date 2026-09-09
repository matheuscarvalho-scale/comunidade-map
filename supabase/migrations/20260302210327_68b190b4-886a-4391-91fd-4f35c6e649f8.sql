
-- Fix the overly permissive insert policy - restrict to triggers only (they run as SECURITY DEFINER)
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
