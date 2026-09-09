-- Create post_replies table for comments
CREATE TABLE public.post_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_replies
CREATE POLICY "Authenticated users can view replies"
ON public.post_replies FOR SELECT
USING (true);

CREATE POLICY "Users can create replies"
ON public.post_replies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
ON public.post_replies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
ON public.post_replies FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update replies_count
CREATE OR REPLACE FUNCTION public.update_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET replies_count = COALESCE(replies_count, 0) + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET replies_count = GREATEST(COALESCE(replies_count, 0) - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for replies_count
CREATE TRIGGER on_reply_insert
  AFTER INSERT ON public.post_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_replies_count();

CREATE TRIGGER on_reply_delete
  AFTER DELETE ON public.post_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_replies_count();

-- Enable realtime for community posts and replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_replies;