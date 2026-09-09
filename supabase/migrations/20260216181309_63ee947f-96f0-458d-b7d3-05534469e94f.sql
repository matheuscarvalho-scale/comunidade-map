
-- Create trigger function to auto-update votes_count
CREATE OR REPLACE FUNCTION public.update_suggestion_votes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE public.suggestions SET votes_count = votes_count + 1 WHERE id = NEW.suggestion_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE public.suggestions SET votes_count = GREATEST(votes_count - 1, 0) WHERE id = OLD.suggestion_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger
CREATE TRIGGER update_suggestion_votes_count_trigger
AFTER INSERT OR DELETE ON public.suggestion_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_suggestion_votes_count();

-- Also create trigger for comments_count
CREATE OR REPLACE FUNCTION public.update_suggestion_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.suggestions SET comments_count = comments_count + 1 WHERE id = NEW.suggestion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.suggestions SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_suggestion_comments_count_trigger
AFTER INSERT OR DELETE ON public.suggestion_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_suggestion_comments_count();
