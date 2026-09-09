-- 1. Create access_level enum
CREATE TYPE public.video_access_level AS ENUM ('public', 'members', 'pro', 'enterprise');

-- 2. Create cloudflare_videos table
CREATE TABLE public.cloudflare_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cloudflare_video_uid text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  duration integer DEFAULT 0,
  thumbnail_url text,
  access_level video_access_level NOT NULL DEFAULT 'members',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create video_progress table
CREATE TABLE public.video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_uid text NOT NULL,
  progress_seconds integer NOT NULL DEFAULT 0,
  total_seconds integer,
  completed boolean NOT NULL DEFAULT false,
  watched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_uid)
);

-- 4. Enable RLS
ALTER TABLE public.cloudflare_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- 5. RLS for cloudflare_videos: 
-- Public videos → everyone authenticated can see
-- Members → any active subscription
-- Pro → pro or enterprise subscription
-- Enterprise → enterprise subscription only
-- Admins can do everything
CREATE POLICY "Admins full access on cloudflare_videos"
  ON public.cloudflare_videos
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view videos matching their access level"
  ON public.cloudflare_videos
  FOR SELECT
  TO authenticated
  USING (
    access_level = 'public'
    OR (
      access_level = 'members' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND subscription_status = 'active'
      )
    )
    OR (
      access_level = 'pro' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND subscription_status = 'active' AND subscription_plan IN ('pro', 'enterprise')
      )
    )
    OR (
      access_level = 'enterprise' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND subscription_status = 'active' AND subscription_plan = 'enterprise'
      )
    )
  );

-- 6. RLS for video_progress: users only see/modify their own
CREATE POLICY "Users manage own video progress"
  ON public.video_progress
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. Admins can read all progress
CREATE POLICY "Admins read all video progress"
  ON public.video_progress
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. Trigger for updated_at on cloudflare_videos
CREATE TRIGGER update_cloudflare_videos_updated_at
  BEFORE UPDATE ON public.cloudflare_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();