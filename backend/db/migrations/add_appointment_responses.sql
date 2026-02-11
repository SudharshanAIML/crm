-- Migration: Add appointment response tracking to tasks table
-- Tracks contact's response to appointment emails (PENDING, ACCEPTED, RESCHEDULE_REQUESTED, CANCELLED)

ALTER TABLE tasks
ADD COLUMN appointment_status ENUM('PENDING', 'ACCEPTED', 'RESCHEDULE_REQUESTED', 'CANCELLED') DEFAULT 'PENDING',
ADD COLUMN appointment_response_at DATETIME DEFAULT NULL,
ADD COLUMN appointment_notes TEXT DEFAULT NULL;

-- Index for quick filtering by appointment status
CREATE INDEX idx_tasks_appointment_status ON tasks(appointment_status);
