-- Support multiple materials (PDF/PPT/Planilha) per content item, instead of just one.
-- Mirrors the content_item_mentors junction-table pattern already used on this table.
CREATE TABLE public.content_item_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  url text NOT NULL,
  name text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_item_materials_item ON public.content_item_materials(content_item_id);

GRANT SELECT ON public.content_item_materials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.content_item_materials TO authenticated;
GRANT ALL ON public.content_item_materials TO service_role;

ALTER TABLE public.content_item_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content item materials"
ON public.content_item_materials FOR SELECT
USING (true);

CREATE POLICY "Admins can insert content item materials"
ON public.content_item_materials FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update content item materials"
ON public.content_item_materials FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete content item materials"
ON public.content_item_materials FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Migrate any existing single material into the new table
INSERT INTO public.content_item_materials (content_item_id, url, name, order_index)
SELECT id, material_url, material_name, 0
FROM public.content_items
WHERE material_url IS NOT NULL;

-- The single-material columns are now replaced by content_item_materials
ALTER TABLE public.content_items DROP COLUMN IF EXISTS material_url;
ALTER TABLE public.content_items DROP COLUMN IF EXISTS material_name;
