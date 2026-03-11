-- =====================================================
-- A/B TESTING FOR EMAILS
-- Three tables: ab_tests, ab_test_recipients, ab_test_link_clicks
-- =====================================================

-- ─── 1. A/B TESTS (the experiment) ──────────────────
CREATE TABLE IF NOT EXISTS ab_tests (
  test_id       INT          AUTO_INCREMENT PRIMARY KEY,
  company_id    INT          NOT NULL,
  created_by    INT          NOT NULL,
  name          VARCHAR(255) NOT NULL,

  -- Variant A
  subject_a     VARCHAR(500) NOT NULL,
  body_a        TEXT         NOT NULL,

  -- Variant B
  subject_b     VARCHAR(500) NOT NULL,
  body_b        TEXT         NOT NULL,

  -- Config
  split_pct     TINYINT      NOT NULL DEFAULT 50,  -- % of recipients who get A (rest get B)
  status        ENUM('DRAFT','SENDING','SENT','CANCELLED') NOT NULL DEFAULT 'DRAFT',

  -- Aggregated counters (denormalized for fast dashboard reads)
  total_a       INT NOT NULL DEFAULT 0,
  total_b       INT NOT NULL DEFAULT 0,
  opened_a      INT NOT NULL DEFAULT 0,
  opened_b      INT NOT NULL DEFAULT 0,
  clicked_a     INT NOT NULL DEFAULT 0,
  clicked_b     INT NOT NULL DEFAULT 0,
  replied_a     INT NOT NULL DEFAULT 0,
  replied_b     INT NOT NULL DEFAULT 0,

  sent_at       TIMESTAMP    NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES employees(emp_id)     ON DELETE CASCADE,
  INDEX idx_ab_company (company_id),
  INDEX idx_ab_status  (status)
);

-- ─── 2. RECIPIENTS (one row per contact per test) ───
CREATE TABLE IF NOT EXISTS ab_test_recipients (
  recipient_id  INT          AUTO_INCREMENT PRIMARY KEY,
  test_id       INT          NOT NULL,
  contact_id    INT          NOT NULL,
  company_id    INT          NOT NULL,
  variant       ENUM('A','B') NOT NULL,

  -- Per-recipient tracking
  email_id      INT          NULL,               -- FK to emails table (set after send)
  tracking_token VARCHAR(36) NULL,               -- UUID for open-tracking pixel
  opened        TINYINT(1)  NOT NULL DEFAULT 0,
  opened_at     TIMESTAMP   NULL,
  clicked       TINYINT(1)  NOT NULL DEFAULT 0,
  clicked_at    TIMESTAMP   NULL,
  replied       TINYINT(1)  NOT NULL DEFAULT 0,
  replied_at    TIMESTAMP   NULL,

  sent_at       TIMESTAMP   NULL,
  created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_test_contact (test_id, contact_id),
  FOREIGN KEY (test_id)    REFERENCES ab_tests(test_id)      ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(contact_id)   ON DELETE CASCADE,
  INDEX idx_abrec_test    (test_id),
  INDEX idx_abrec_contact (contact_id),
  INDEX idx_abrec_token   (tracking_token),
  -- Reply-check scheduler index
  INDEX idx_abrec_reply   (replied, sent_at)
);

-- ─── 3. LINK CLICK LOG (per-link granularity) ───────
CREATE TABLE IF NOT EXISTS ab_test_link_clicks (
  click_id      INT          AUTO_INCREMENT PRIMARY KEY,
  recipient_id  INT          NOT NULL,
  test_id       INT          NOT NULL,
  url           TEXT         NOT NULL,
  clicked_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (recipient_id) REFERENCES ab_test_recipients(recipient_id) ON DELETE CASCADE,
  FOREIGN KEY (test_id)      REFERENCES ab_tests(test_id)                ON DELETE CASCADE,
  INDEX idx_lc_recipient (recipient_id),
  INDEX idx_lc_test      (test_id)
);
