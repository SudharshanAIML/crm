-- Migration: Add Google Calendar sync support to tasks table
-- This stores the Google Calendar event ID for each synced task

ALTER TABLE tasks
ADD COLUMN google_calendar_event_id VARCHAR(255) DEFAULT NULL;

-- Index for quick lookup of synced tasks
CREATE INDEX idx_tasks_gcal_event ON tasks(google_calendar_event_id);
