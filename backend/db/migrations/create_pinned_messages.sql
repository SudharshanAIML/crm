-- Pinned messages per channel
-- Any channel member can pin/unpin.
-- UNIQUE KEY prevents duplicate pins; CASCADE deletes clean up automatically.
CREATE TABLE IF NOT EXISTS discuss_pinned_messages (
  id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  channel_id  INT          NOT NULL,
  message_id  BIGINT       NOT NULL,
  pinned_by   INT          NOT NULL,
  pinned_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_channel_message (channel_id, message_id),
  KEY        idx_channel_pinned (channel_id, pinned_at DESC),

  CONSTRAINT fk_pin_channel  FOREIGN KEY (channel_id) REFERENCES discuss_channels(channel_id) ON DELETE CASCADE,
  CONSTRAINT fk_pin_message  FOREIGN KEY (message_id) REFERENCES discuss_messages(message_id) ON DELETE CASCADE,
  CONSTRAINT fk_pin_pinner   FOREIGN KEY (pinned_by)  REFERENCES employees(emp_id)            ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
