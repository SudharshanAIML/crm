-- Migration: Add OAuth tokens to employees table for Gmail API access
-- This allows employees to send emails via their own Gmail accounts

ALTER TABLE employees
ADD COLUMN google_access_token TEXT DEFAULT NULL,
ADD COLUMN google_refresh_token TEXT DEFAULT NULL,
ADD COLUMN google_token_expiry TIMESTAMP DEFAULT NULL,
ADD COLUMN email_connected BOOLEAN DEFAULT FALSE;

-- Add index for quick lookup of connected email accounts
CREATE INDEX idx_email_connected ON employees(email_connected);

-- Add Gmail message ID column to emails table for tracking
ALTER TABLE emails
ADD COLUMN gmail_message_id VARCHAR(255) DEFAULT NULL;
