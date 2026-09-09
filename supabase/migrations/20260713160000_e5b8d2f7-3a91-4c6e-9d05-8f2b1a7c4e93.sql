-- Move every "Webinars" resource into the "Mentorias" category on the Recursos page.
-- Also strip the word "Webinar" from the title: the Recursos grouping (resourceGrouping.ts)
-- detects the platform from title+category+description combined, and "webinar" takes
-- priority over "mentoria" in that check — so the category change alone wouldn't move
-- the card to the Mentorias group while the title still says "Webinar...".
UPDATE public.resources
SET
  category = 'Mentorias',
  title = regexp_replace(title, 'webinar', 'Mentoria', 'gi')
WHERE category = 'Webinars';
