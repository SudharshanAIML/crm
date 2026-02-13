-- =====================================================
-- DISCUSS (Team Chat) Feature - Database Schema
-- =====================================================
-- Discord-like team chat within each company
-- Supports channels, messages, mentions (employees & deals)
-- =====================================================

-- 1. Channels table - organize conversations by topic
CREATE TABLE IF NOT EXISTS discuss_channels (
  channel_id    INT AUTO_INCREMENT PRIMARY KEY,
  company_id    INT NOT NULL,
  name          VARCHAR(80) NOT NULL,
  description   VARCHAR(255) DEFAULT NULL,
  is_default    BOOLEAN DEFAULT FALSE,            -- auto-join channel for all employees
  created_by    INT NOT NULL,                     -- emp_id who created the channel
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_company_channel (company_id, name),
  INDEX idx_company (company_id)
);

-- 2. Channel members - who is in each channel
CREATE TABLE IF NOT EXISTS discuss_channel_members (
  channel_id    INT NOT NULL,
  emp_id        INT NOT NULL,
  joined_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- cursor for unread badge

  PRIMARY KEY (channel_id, emp_id),
  INDEX idx_emp (emp_id)
);

-- 3. Messages table - the chat messages
--    parent_message_id enables threaded replies (nullable = top-level)
CREATE TABLE IF NOT EXISTS discuss_messages (
  message_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  channel_id        INT NOT NULL,
  sender_emp_id     INT NOT NULL,
  content           TEXT NOT NULL,
  parent_message_id BIGINT DEFAULT NULL,            -- NULL = top-level, set = thread reply
  is_edited         BOOLEAN DEFAULT FALSE,
  is_deleted        BOOLEAN DEFAULT FALSE,           -- soft-delete for audit trail
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_channel_created (channel_id, created_at DESC),
  INDEX idx_sender (sender_emp_id),
  INDEX idx_parent (parent_message_id)
);

-- 4. Mentions table - tracks @employee and #deal mentions inside messages
--    mention_type: 'EMPLOYEE' or 'DEAL'
--    ref_id: emp_id or deal_id depending on type
CREATE TABLE IF NOT EXISTS discuss_mentions (
  mention_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  message_id    BIGINT NOT NULL,
  mention_type  ENUM('EMPLOYEE', 'DEAL') NOT NULL,
  ref_id        INT NOT NULL,                       -- emp_id or deal_id

  INDEX idx_message (message_id),
  INDEX idx_ref (mention_type, ref_id)
);

-- 5. Seed a "general" default channel per company (optional helper)
--    Run manually or in app code on company creation
-- INSERT INTO discuss_channels (company_id, name, description, is_default, created_by)
-- VALUES (1, 'general', 'Company-wide discussions', TRUE, 1);
