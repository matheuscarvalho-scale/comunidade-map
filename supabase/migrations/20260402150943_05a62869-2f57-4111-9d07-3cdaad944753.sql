
-- 1) Remove the INSERT trigger on resources that fires even when inactive
DROP TRIGGER IF EXISTS notify_new_resource_trigger ON resources;
DROP FUNCTION IF EXISTS notify_new_resource();

-- 2) Update track trigger to also fire when is_coming_soon changes from true to false
CREATE OR REPLACE FUNCTION public.notify_new_track()
RETURNS trigger AS $$
BEGIN
  -- Fire when activated (and not coming soon)
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) AND NEW.is_coming_soon = false THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, '🎯 Nova Trilha de Conteúdo', 'A trilha "' || NEW.title || '" está disponível!', 'new_track', NEW.id);
  -- Fire when "coming soon" is removed on an active track
  ELSIF NEW.is_active = true AND NEW.is_coming_soon = false AND OLD IS NOT NULL AND OLD.is_coming_soon = true THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NULL, '🎯 Nova Trilha de Conteúdo', 'A trilha "' || NEW.title || '" está disponível!', 'new_track', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
