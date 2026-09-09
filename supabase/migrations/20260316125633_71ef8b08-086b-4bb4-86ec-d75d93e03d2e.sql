
-- Force fix: Drop ALL old public-role SELECT policies and recreate as authenticated

-- mentors
DROP POLICY IF EXISTS "Authenticated users can view mentors" ON public.mentors;
CREATE POLICY "Authenticated users can view mentors"
  ON public.mentors FOR SELECT TO authenticated USING (true);

-- mentoring_sessions
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON public.mentoring_sessions;
DROP POLICY IF EXISTS "Authenticated users can view active sessions" ON public.mentoring_sessions;
CREATE POLICY "Authenticated users can view active sessions"
  ON public.mentoring_sessions FOR SELECT TO authenticated USING (is_active = true);

-- content_items
DROP POLICY IF EXISTS "Authenticated users can view content items" ON public.content_items;
CREATE POLICY "Authenticated users can view content items"
  ON public.content_items FOR SELECT TO authenticated USING (true);

-- user_achievements
DROP POLICY IF EXISTS "All users can view unlocked achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Authenticated users can view unlocked achievements" ON public.user_achievements;
CREATE POLICY "Authenticated users can view unlocked achievements"
  ON public.user_achievements FOR SELECT TO authenticated USING (unlocked_at IS NOT NULL);

-- suggestions
DROP POLICY IF EXISTS "Authenticated users can view suggestions" ON public.suggestions;
CREATE POLICY "Authenticated users can view suggestions"
  ON public.suggestions FOR SELECT TO authenticated USING (true);

-- suggestion_comments
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.suggestion_comments;
CREATE POLICY "Authenticated users can view comments"
  ON public.suggestion_comments FOR SELECT TO authenticated USING (true);

-- suggestion_votes
DROP POLICY IF EXISTS "Authenticated users can view votes" ON public.suggestion_votes;
CREATE POLICY "Authenticated users can view votes"
  ON public.suggestion_votes FOR SELECT TO authenticated USING (true);
