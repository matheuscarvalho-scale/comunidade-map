
-- 1. Explicit service_role policies (defense in depth - service_role bypasses RLS but explicit is safer)
CREATE POLICY "Service role manages conta_azul_tokens"
ON public.conta_azul_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages payment_events"
ON public.payment_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages pending_payments"
ON public.pending_payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Users can read their own mentoring email reminders
CREATE POLICY "Users can view own mentoring reminders"
ON public.mentoring_email_reminders FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 3. Tighten realtime policy: require active subscription for community/post topics
DROP POLICY IF EXISTS "Authenticated users can read own DM channels" ON realtime.messages;

CREATE POLICY "Authenticated users can read own DM channels"
ON realtime.messages FOR SELECT TO authenticated
USING (
  -- DM/inbox topics scoped to the authenticated user
  (topic = ('member_messages_inbox_'::text || (auth.uid())::text))
  OR (topic = ('user:'::text || (auth.uid())::text))
  OR (topic ~ (('^dm:'::text || (auth.uid())::text) || '(:[0-9a-fA-F-]{36})?$'::text))
  OR (topic ~ (('^dm:[0-9a-fA-F-]{36}:'::text || (auth.uid())::text) || '$'::text))
  OR (topic ~ (('^messages:'::text || (auth.uid())::text) || '(:[0-9a-fA-F-]{36})?$'::text))
  OR (topic ~ (('^messages:[0-9a-fA-F-]{36}:'::text || (auth.uid())::text) || '$'::text))
  -- Community/posts topics: require active subscription OR staff role
  OR (
    (
      topic = ANY (ARRAY['community_posts'::text, 'post_replies'::text, 'community-posts'::text, 'post-replies'::text])
      OR topic LIKE 'community:%'
      OR topic LIKE 'posts:%'
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.subscription_status = 'active'
      )
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'cx'::app_role)
      OR public.has_role(auth.uid(), 'comercial'::app_role)
      OR public.has_role(auth.uid(), 'marketing'::app_role)
      OR public.has_role(auth.uid(), 'automacao'::app_role)
    )
  )
);
