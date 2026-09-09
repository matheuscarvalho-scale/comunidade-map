-- First, drop the check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'achievements_category_check' 
    AND table_name = 'achievements'
  ) THEN
    ALTER TABLE public.achievements DROP CONSTRAINT achievements_category_check;
  END IF;
END $$;

-- Add seasonal/special achievement fields (if not already added)
ALTER TABLE public.achievements 
ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS season_name TEXT;

-- Create achievement_notifications table for tracking badge unlock notifications
CREATE TABLE IF NOT EXISTS public.achievement_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievement_notifications ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own achievement notifications" ON public.achievement_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.achievement_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.achievement_notifications;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own achievement notifications"
ON public.achievement_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
ON public.achievement_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
ON public.achievement_notifications
FOR INSERT
WITH CHECK (true);

-- Create indexes (if not exist)
CREATE INDEX IF NOT EXISTS idx_achievement_notifications_user ON public.achievement_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_achievements_seasonal ON public.achievements(is_seasonal) WHERE is_seasonal = true;

-- Function to create notification when achievement is unlocked
CREATE OR REPLACE FUNCTION public.notify_achievement_unlock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if the achievement was just unlocked
  IF NEW.unlocked_at IS NOT NULL AND (OLD IS NULL OR OLD.unlocked_at IS NULL) THEN
    INSERT INTO public.achievement_notifications (user_id, achievement_id)
    VALUES (NEW.user_id, NEW.achievement_id);
    
    -- Update user's total points
    UPDATE public.profiles 
    SET total_points = COALESCE(total_points, 0) + COALESCE((
      SELECT points FROM public.achievements WHERE id = NEW.achievement_id
    ), 0)
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to notify on achievement unlock
DROP TRIGGER IF EXISTS on_achievement_unlock ON public.user_achievements;
CREATE TRIGGER on_achievement_unlock
AFTER INSERT OR UPDATE ON public.user_achievements
FOR EACH ROW
EXECUTE FUNCTION public.notify_achievement_unlock();

-- Add RLS policy for viewing all user achievements (for leaderboard)
DROP POLICY IF EXISTS "All users can view unlocked achievements" ON public.user_achievements;
CREATE POLICY "All users can view unlocked achievements"
ON public.user_achievements
FOR SELECT
USING (unlocked_at IS NOT NULL);