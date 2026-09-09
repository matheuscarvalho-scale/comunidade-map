
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- NULL = broadcast to all
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'new_formation', 'new_webinar', 'new_track', 'new_mentoring', 'info'
  reference_id UUID, -- ID of the related entity
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can see broadcast notifications (user_id IS NULL) or their own
CREATE POLICY "Users can view own and broadcast notifications"
ON public.notifications FOR SELECT
USING (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- Users can mark as read
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- Only service role / admins can insert
CREATE POLICY "Admins can manage notifications"
ON public.notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-notify on new published formation
CREATE OR REPLACE FUNCTION public.notify_new_formation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, 'Nova Formação', 'A formação "' || NEW.title || '" está disponível!', 'new_formation', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_formation
AFTER INSERT OR UPDATE ON public.formations
FOR EACH ROW EXECUTE FUNCTION public.notify_new_formation();

-- Auto-notify on new active webinar
CREATE OR REPLACE FUNCTION public.notify_new_webinar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, 'Novo Webinar', 'O webinar "' || NEW.title || '" foi agendado!', 'new_webinar', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_webinar
AFTER INSERT OR UPDATE ON public.webinars
FOR EACH ROW EXECUTE FUNCTION public.notify_new_webinar();

-- Auto-notify on new active content track
CREATE OR REPLACE FUNCTION public.notify_new_track()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, 'Nova Trilha de Conteúdo', 'A trilha "' || NEW.title || '" está disponível!', 'new_track', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_track
AFTER INSERT OR UPDATE ON public.content_tracks
FOR EACH ROW EXECUTE FUNCTION public.notify_new_track();

-- Auto-notify on new active mentoring session
CREATE OR REPLACE FUNCTION public.notify_new_mentoring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, 'Nova Mentoria', 'A sessão "' || NEW.title || '" foi agendada!', 'new_mentoring', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_mentoring
AFTER INSERT OR UPDATE ON public.mentoring_sessions
FOR EACH ROW EXECUTE FUNCTION public.notify_new_mentoring();

-- Index for fast lookup
CREATE INDEX idx_notifications_user_read ON public.notifications (user_id, is_read, created_at DESC);
