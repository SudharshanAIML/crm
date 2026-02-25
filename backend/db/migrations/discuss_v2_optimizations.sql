-- =====================================================
-- DISCUSS v2 Optimizations
-- Run after: create_discuss.sql
-- Note: runner safely ignores "already exists" errors
-- =====================================================

-- 1. Indexes on messages for cursor-based pagination
CREATE INDEX idx_channel_active ON discuss_messages (channel_id, is_deleted, message_id DESC);
CREATE INDEX idx_channel_msg_id ON discuss_messages (channel_id, message_id DESC);

-- 2. Composite index on mentions
CREATE INDEX idx_ref_message ON discuss_mentions (mention_type, ref_id, message_id DESC);

-- 3. Add channel_type column
ALTER TABLE discuss_channels ADD COLUMN channel_type ENUM('PUBLIC','PRIVATE') NOT NULL DEFAULT 'PUBLIC' AFTER is_default;

-- 4. Invitations table
CREATE TABLE IF NOT EXISTS discuss_channel_invitations (
  invite_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  channel_id      INT NOT NULL,
  inviter_emp_id  INT NOT NULL,
  invitee_emp_id  INT NOT NULL,
  status          ENUM('PENDING','ACCEPTED','DECLINED') NOT NULL DEFAULT 'PENDING',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_channel_invitee (channel_id, invitee_emp_id),
  INDEX idx_invitee (invitee_emp_id),
  INDEX idx_channel (channel_id)
);
