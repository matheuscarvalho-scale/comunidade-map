-- Tighten realtime.messages DM topic policy: replace trailing wildcards with exact UUID matching
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
  -- App-specific inbox channel: exact match on user id
  OR topic = ('member_messages_inbox_' || (auth.uid())::text)
  OR topic = ('user:' || (auth.uid())::text)
  -- Private DM channels: strict format dm:<uid> or dm:<uid>:<other_uid> (UUIDs only, no wildcard injection)
  OR topic ~ ('^dm:' || (auth.uid())::text || '(:[0-9a-fA-F-]{36})?$')
  OR topic ~ ('^dm:[0-9a-fA-F-]{36}:' || (auth.uid())::text || '$')
  OR topic ~ ('^messages:' || (auth.uid())::text || '(:[0-9a-fA-F-]{36})?$')
  OR topic ~ ('^messages:[0-9a-fA-F-]{36}:' || (auth.uid())::text || '$')
);

-- Add explicit service_role INSERT policy on webinar_email_reminders for clarity
-- (service_role bypasses RLS, but this makes the access path explicit)
DROP POLICY IF EXISTS "Service role can insert reminders" ON public.webinar_email_reminders;
CREATE POLICY "Service role can insert reminders"
ON public.webinar_email_reminders
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage webinar reminders" ON public.webinar_email_reminders;
CREATE POLICY "Service role can manage webinar reminders"
ON public.webinar_email_reminders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);