-- =====================================================
-- EMAIL SEQUENCES (Multi-Touch Outreach)
-- Four tables: sequences, steps, enrollments, execution log
-- =====================================================

-- ─── 1. SEQUENCES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sequences (
  sequence_id    INT          AUTO_INCREMENT PRIMARY KEY,
  company_id     INT          NOT NULL,
  created_by     INT          NOT NULL,
  name           VARCHAR(255) NOT NULL,
  description    TEXT         NULL,
  status         ENUM('DRAFT','ACTIVE','PAUSED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  -- aggregated counters (denormalised for fast dashboard reads)
  enrollment_count  INT NOT NULL DEFAULT 0,
  completed_count   INT NOT NULL DEFAULT 0,
  replied_count     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES employees(emp_id)    ON DELETE CASCADE,
  INDEX idx_seq_company (company_id),
  INDEX idx_seq_status  (status)
);

-- ─── 2. SEQUENCE STEPS ───────────────────────────────
CREATE TABLE IF NOT EXISTS sequence_steps (
  step_id        INT          AUTO_INCREMENT PRIMARY KEY,
  sequence_id    INT          NOT NULL,
  step_order     INT          NOT NULL,          -- 1-based, determines execution order
  delay_days     INT          NOT NULL DEFAULT 0, -- days after PREVIOUS step (or enrollment for step 1)
  subject        VARCHAR(500) NOT NULL,
  body           TEXT         NOT NULL,
  template_id    INT          NULL,              -- optional source template (informational)
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (sequence_id) REFERENCES sequences(sequence_id)         ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES email_templates(template_id)   ON DELETE SET NULL,
  INDEX idx_step_sequence (sequence_id),
  UNIQUE KEY uq_step_order (sequence_id, step_order)
);

-- ─── 3. ENROLLMENTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  enrollment_id  INT          AUTO_INCREMENT PRIMARY KEY,
  sequence_id    INT          NOT NULL,
  contact_id     INT          NOT NULL,
  enrolled_by    INT          NOT NULL,
  company_id     INT          NOT NULL,
  status         ENUM('ACTIVE','PAUSED','COMPLETED','CANCELLED','REPLIED')
                              NOT NULL DEFAULT 'ACTIVE',
  current_step   INT          NOT NULL DEFAULT 0, -- last step sent (0 = none yet)
  enrolled_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_send_at   TIMESTAMP    NULL,               -- NULL means "waiting for scheduler to set"
  completed_at   TIMESTAMP    NULL,
  paused_at      TIMESTAMP    NULL,
  pause_reason   VARCHAR(255) NULL,

  -- A contact can be enrolled in a given sequence only once at a time
  UNIQUE KEY uq_enrollment (sequence_id, contact_id),

  FOREIGN KEY (sequence_id) REFERENCES sequences(sequence_id)  ON DELETE CASCADE,
  FOREIGN KEY (contact_id)  REFERENCES contacts(contact_id)    ON DELETE CASCADE,
  FOREIGN KEY (enrolled_by) REFERENCES employees(emp_id),
  FOREIGN KEY (company_id)  REFERENCES companies(company_id)   ON DELETE CASCADE,

  INDEX idx_enroll_company          (company_id),
  INDEX idx_enroll_contact          (contact_id),
  -- Scheduler queries by status + next_send_at — critical compound index
  INDEX idx_enroll_sched            (status, next_send_at)
);

-- ─── 4. EXECUTION LOG ────────────────────────────────
CREATE TABLE IF NOT EXISTS sequence_execution_log (
  log_id         INT          AUTO_INCREMENT PRIMARY KEY,
  enrollment_id  INT          NOT NULL,
  step_id        INT          NOT NULL,
  contact_id     INT          NOT NULL,
  company_id     INT          NOT NULL,
  email_id       INT          NULL,              -- FK to emails table (NULL if send failed)
  status         ENUM('SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'SENT',
  executed_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  error_message  TEXT         NULL,

  FOREIGN KEY (enrollment_id) REFERENCES sequence_enrollments(enrollment_id) ON DELETE CASCADE,
  FOREIGN KEY (step_id)       REFERENCES sequence_steps(step_id)             ON DELETE CASCADE,
  INDEX idx_log_enrollment (enrollment_id),
  INDEX idx_log_company    (company_id)
);
