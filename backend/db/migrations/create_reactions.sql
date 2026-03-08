-- Emoji reactions on discuss messages
-- Each (message_id, emp_id, emoji) triple is unique — toggle semantics: INSERT / DELETE
-- Emoji values are validated in the service layer (whitelist of 6 emojis)

CREATE TABLE IF NOT EXISTS discuss_reactions (
  id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message_id  BIGINT       NOT NULL,
  emp_id      INT          NOT NULL,
  emoji       VARCHAR(10)  NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate reactions and enable fast toggle checks
  UNIQUE KEY uq_reaction          (message_id, emp_id, emoji),

  -- Fast aggregation by message (for bulk-fetch at channel load)
  KEY        idx_message_emoji    (message_id, emoji),

  CONSTRAINT fk_reaction_message  FOREIGN KEY (message_id) REFERENCES discuss_messages(message_id) ON DELETE CASCADE,
  CONSTRAINT fk_reaction_emp      FOREIGN KEY (emp_id)     REFERENCES employees(emp_id)            ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
