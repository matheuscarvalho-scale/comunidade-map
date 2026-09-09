-- Remove duplicates keeping the earliest record
DELETE FROM webinar_email_reminders a
USING webinar_email_reminders b
WHERE a.webinar_id = b.webinar_id
  AND a.user_id = b.user_id
  AND a.reminder_type = b.reminder_type
  AND a.id > b.id;

-- Add unique constraint
ALTER TABLE webinar_email_reminders
ADD CONSTRAINT uq_webinar_reminder_webinar_user_type
UNIQUE (webinar_id, user_id, reminder_type);