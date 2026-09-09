
-- Create webinar scarcity config table
CREATE TABLE public.webinar_scarcity_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  base_fake_registrations INTEGER NOT NULL DEFAULT 70,
  show_live_counter BOOLEAN NOT NULL DEFAULT true,
  show_notifications BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(webinar_id)
);

-- Enable RLS
ALTER TABLE public.webinar_scarcity_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage scarcity config"
ON public.webinar_scarcity_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view active configs
CREATE POLICY "Authenticated users can view scarcity config"
ON public.webinar_scarcity_config
FOR SELECT
USING (is_active = true);
