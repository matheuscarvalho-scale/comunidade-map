-- Junction table for multiple official mentors per content item
CREATE TABLE public.content_item_mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (content_item_id, mentor_id)
);

CREATE INDEX idx_content_item_mentors_item ON public.content_item_mentors(content_item_id);
CREATE INDEX idx_content_item_mentors_mentor ON public.content_item_mentors(mentor_id);

GRANT SELECT ON public.content_item_mentors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.content_item_mentors TO authenticated;
GRANT ALL ON public.content_item_mentors TO service_role;

ALTER TABLE public.content_item_mentors ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read, matching content_items visibility patterns
CREATE POLICY "Anyone can view content item mentors"
ON public.content_item_mentors FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert content item mentors"
ON public.content_item_mentors FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update content item mentors"
ON public.content_item_mentors FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete content item mentors"
ON public.content_item_mentors FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));