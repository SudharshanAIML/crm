-- Add google_meet_link column to tasks table
-- Stores the Google Meet conference link generated via Google Calendar API
ALTER TABLE tasks ADD COLUMN google_meet_link VARCHAR(500) DEFAULT NULL AFTER google_calendar_event_id;
