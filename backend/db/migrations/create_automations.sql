-- =====================================================
-- AUTOMATION ENGINE TABLES
-- Advanced workflow automation for CRM events
-- =====================================================

-- Main automations table (workflow definitions)
CREATE TABLE IF NOT EXISTS automations (
  automation_id   INT AUTO_INCREMENT PRIMARY KEY,
  company_id      INT NOT NULL,
  created_by      INT DEFAULT NULL,
  name            VARCHAR(255) NOT NULL,
  description     TEXT DEFAULT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  is_draft        BOOLEAN NOT NULL DEFAULT TRUE,

  -- Trigger configuration
  trigger_type    VARCHAR(100) NOT NULL,
  -- JSON: extra trigger filters, e.g. {"stage":"SQL"} or {"status":"CUSTOMER"}
  trigger_config  JSON DEFAULT NULL,

  -- Workflow definition – full DAG stored as JSON
  -- Array of nodes: {id, type, config, next, nextElse}
  workflow        JSON NOT NULL,

  -- Stats (denormalised for fast reads)
  total_runs      INT NOT NULL DEFAULT 0,
  success_runs    INT NOT NULL DEFAULT 0,
  failure_runs    INT NOT NULL DEFAULT 0,
  last_run_at     DATETIME DEFAULT NULL,

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_auto_company   (company_id),
  INDEX idx_auto_trigger   (trigger_type),
  INDEX idx_auto_active    (company_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Execution log for every automation run
CREATE TABLE IF NOT EXISTS automation_logs (
  log_id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  automation_id   INT NOT NULL,
  company_id      INT NOT NULL,

  -- Trigger context
  trigger_type    VARCHAR(100) NOT NULL,
  trigger_entity_id INT DEFAULT NULL,
  trigger_payload JSON DEFAULT NULL,

  -- Outcome
  status          ENUM('SUCCESS','FAILURE','PARTIAL') NOT NULL DEFAULT 'SUCCESS',
  -- Per-node results  [{nodeId, action, ok, error?, ms}]
  steps           JSON DEFAULT NULL,
  error_message   TEXT DEFAULT NULL,
  duration_ms     INT DEFAULT NULL,

  executed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_log_auto     (automation_id),
  INDEX idx_log_company  (company_id),
  INDEX idx_log_status   (status),
  INDEX idx_log_date     (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
