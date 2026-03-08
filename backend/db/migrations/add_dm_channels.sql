-- =====================================================
-- Direct Messages (DM) support
-- Strategy: Reuse discuss_channels with channel_type = 'DM'
-- A DM "channel" has exactly 2 members in discuss_channel_members.
-- dm_emp1_id / dm_emp2_id are stored sorted (smaller id first)
-- to guarantee a unique pair per company via the unique index.
-- =====================================================

-- 1. Allow 'DM' as a valid channel_type value
--    The column is ENUM('PUBLIC','PRIVATE') — extend it to include 'DM'
ALTER TABLE discuss_channels
  MODIFY COLUMN channel_type ENUM('PUBLIC','PRIVATE','DM') NOT NULL DEFAULT 'PUBLIC';

-- 1b. Make name nullable so DM channels (which have no name) don't collide
--     on the uq_company_channel (company_id, name) unique key.
--     In MySQL, NULL != NULL in unique indexes, so each DM row is always unique.
ALTER TABLE discuss_channels
  MODIFY COLUMN name VARCHAR(80) NULL DEFAULT NULL;

-- 2. Add DM peer columns to discuss_channels so we can enforce
--    one DM thread per pair per company atomically
ALTER TABLE discuss_channels
  ADD COLUMN dm_emp1_id INT DEFAULT NULL COMMENT 'Lower empId of the DM pair (NULL for regular channels)',
  ADD COLUMN dm_emp2_id INT DEFAULT NULL COMMENT 'Higher empId of the DM pair (NULL for regular channels)',
  ADD UNIQUE KEY uq_dm_pair (company_id, dm_emp1_id, dm_emp2_id);

-- 3. Index for fast lookup of all DMs for a given employee
--    (done via discuss_channel_members JOIN, but this helps the DM-specific query)
ALTER TABLE discuss_channels
  ADD INDEX idx_dm_emp1 (company_id, dm_emp1_id),
  ADD INDEX idx_dm_emp2 (company_id, dm_emp2_id);
