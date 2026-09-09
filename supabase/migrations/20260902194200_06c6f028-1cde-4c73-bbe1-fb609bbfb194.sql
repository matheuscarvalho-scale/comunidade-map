-- content_item_materials
DROP POLICY "Anyone can view content item materials" ON public.content_item_materials;
CREATE POLICY "Active members can view content item materials"
ON public.content_item_materials FOR SELECT TO authenticated
USING (public.is_active_member());

-- courses
DROP POLICY "Authenticated users can view courses" ON public.courses;
CREATE POLICY "Authenticated users can view courses"
ON public.courses FOR SELECT TO authenticated
USING (public.is_active_member());

-- lessons
DROP POLICY "Authenticated users can view lessons" ON public.lessons;
CREATE POLICY "Authenticated users can view lessons"
ON public.lessons FOR SELECT TO authenticated
USING (public.is_active_member());

-- lesson_materials
DROP POLICY "Authenticated users can view lesson materials" ON public.lesson_materials;
CREATE POLICY "Authenticated users can view lesson materials"
ON public.lesson_materials FOR SELECT TO authenticated
USING (public.is_active_member());

-- resources
DROP POLICY "Authenticated users can view resources" ON public.resources;
CREATE POLICY "Authenticated users can view resources"
ON public.resources FOR SELECT TO authenticated
USING (public.is_active_member());

-- content_tracks
DROP POLICY "Authenticated users can view active content tracks" ON public.content_tracks;
CREATE POLICY "Authenticated users can view active content tracks"
ON public.content_tracks FOR SELECT TO authenticated
USING (is_active = true AND public.is_active_member());

-- content_items
DROP POLICY "Authenticated users can view items from active tracks" ON public.content_items;
CREATE POLICY "Authenticated users can view items from active tracks"
ON public.content_items FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.content_tracks ct WHERE ct.id = content_items.track_id AND ct.is_active = true)
  AND public.is_active_member()
);

-- formations
DROP POLICY "Users can view published formations" ON public.formations;
CREATE POLICY "Users can view published formations"
ON public.formations FOR SELECT TO authenticated
USING (is_published = true AND public.is_active_member());

-- formation_modules
DROP POLICY "Users can view modules of published formations" ON public.formation_modules;
CREATE POLICY "Users can view modules of published formations"
ON public.formation_modules FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.formations f WHERE f.id = formation_modules.formation_id AND f.is_published = true)
  AND public.is_active_member()
);

-- formation_lessons
DROP POLICY "Users can view lessons of published formations" ON public.formation_lessons;
CREATE POLICY "Users can view lessons of published formations"
ON public.formation_lessons FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.formation_modules fm
    JOIN public.formations f ON f.id = fm.formation_id
    WHERE fm.id = formation_lessons.module_id AND f.is_published = true
  )
  AND public.is_active_member()
);

-- webinars (duas políticas SELECT existentes)
DROP POLICY "Authenticated users can view active webinars" ON public.webinars;
DROP POLICY "Authenticated users can view webinars" ON public.webinars;
CREATE POLICY "Active members can view active webinars"
ON public.webinars FOR SELECT TO authenticated
USING (is_active = true AND public.is_active_member());