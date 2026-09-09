-- Remove duplicates keeping the earliest record
DELETE FROM mentoring_email_reminders a
USING mentoring_email_reminders b
WHERE a.session_id = b.session_id
  AND a.user_id = b.user_id
  AND a.reminder_type = b.reminder_type
  AND a.id > b.id;

-- Now add the unique constraint
ALTER TABLE mentoring_email_reminders
ADD CONSTRAINT uq_mentoring_reminder_session_user_type
UNIQUE (session_id, user_id, reminder_type);