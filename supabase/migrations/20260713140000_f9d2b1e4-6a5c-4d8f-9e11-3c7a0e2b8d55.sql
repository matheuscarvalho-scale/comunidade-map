-- Migrate all content_items from the "Webinars" content_track into the "Mentorias" content_track.
-- The Webinars track itself is kept (not deleted), it just ends up with zero items.
DO $$
DECLARE
  webinars_id UUID;
  mentorias_id UUID;
  moved_count INTEGER;
BEGIN
  SELECT id INTO webinars_id FROM content_tracks WHERE slug = 'webinars';
  SELECT id INTO mentorias_id FROM content_tracks WHERE slug = 'mentorias';

  IF webinars_id IS NULL THEN
    RAISE EXCEPTION 'content_tracks row with slug = ''webinars'' not found';
  END IF;
  IF mentorias_id IS NULL THEN
    RAISE EXCEPTION 'content_tracks row with slug = ''mentorias'' not found';
  END IF;

  UPDATE content_items
  SET track_id = mentorias_id
  WHERE track_id = webinars_id;

  GET DIAGNOSTICS moved_count = ROW_COUNT;
  RAISE NOTICE 'Moved % content_items from webinars (%) to mentorias (%)', moved_count, webinars_id, mentorias_id;
END $$;

-- Recompute order_index for every item now in the Mentorias track, oldest first,
-- based on the DD/MM/YYYY date embedded in the title (falls back to created_at when absent).
WITH mentorias_track AS (
  SELECT id FROM content_tracks WHERE slug = 'mentorias'
),
ordered AS (
  SELECT
    ci.id,
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(
        to_date(substring(ci.title from '(\d{2}/\d{2}/\d{4})'), 'DD/MM/YYYY'),
        ci.created_at::date
      ) ASC
    ) AS new_order
  FROM content_items ci, mentorias_track
  WHERE ci.track_id = mentorias_track.id
)
UPDATE content_items ci
SET order_index = ordered.new_order
FROM ordered
WHERE ci.id = ordered.id;
