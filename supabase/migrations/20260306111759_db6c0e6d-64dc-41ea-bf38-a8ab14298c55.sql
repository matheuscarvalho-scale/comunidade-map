
-- Backfill existing "Via Planilha" records by extracting click_id from notes and looking up the real partner_name from partner_clicks
UPDATE cashback_usage cu
SET partner_name = pc.partner_name
FROM partner_clicks pc
WHERE cu.partner_name = 'Via Planilha'
  AND cu.notes LIKE '%click_id: %'
  AND pc.id = (regexp_match(cu.notes, 'click_id: ([0-9a-f\-]+)'))[1]::uuid
  AND pc.partner_name IS NOT NULL
  AND pc.partner_name != '';
