
-- 1) Recreate profiles_admin without SECURITY DEFINER (use invoker semantics + restrict EXECUTE to admins via RLS-like pattern)
DROP VIEW IF EXISTS public.profiles_admin;
CREATE VIEW public.profiles_admin
WITH (security_invoker = true)
AS
SELECT * FROM public.profiles
WHERE public.has_role(auth.uid(), 'admin'::app_role);

REVOKE ALL ON public.profiles_admin FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_admin TO authenticated;

-- 2) RLS on realtime.messages: scope subscriptions to channels the user is allowed to listen to
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read own DM channels" ON realtime.messages;
CREATE POLICY "Authenticated users can read own DM channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Public channels (community / posts) allowed for any authenticated user
  topic IN ('community_posts', 'post_replies', 'community-posts', 'post-replies')
  OR topic LIKE 'community:%'
  OR topic LIKE 'posts:%'
  -- Private DM channels: topic must include the user's id (e.g. dm:<uid1>:<uid2>)
  OR topic LIKE ('dm:%' || (auth.uid())::text || '%')
  OR topic LIKE ('messages:%' || (auth.uid())::text || '%')
  OR topic = ('user:' || (auth.uid())::text)
);
