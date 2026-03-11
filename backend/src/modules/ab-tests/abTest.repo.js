import { db } from "../../config/db.js";

/* =====================================================
   A/B TESTS – CRUD
===================================================== */

export const createTest = async ({ company_id, created_by, name, subject_a, body_a, subject_b, body_b, split_pct }) => {
  const [r] = await db.query(
    `INSERT INTO ab_tests
       (company_id, created_by, name, subject_a, body_a, subject_b, body_b, split_pct)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [company_id, created_by, name.trim(), subject_a, body_a, subject_b, body_b, split_pct ?? 50]
  );
  return r.insertId;
};

export const getTestById = async (testId) => {
  const [rows] = await db.query(
    `SELECT t.*, e.name AS creator_name
     FROM ab_tests t
     LEFT JOIN employees e ON e.emp_id = t.created_by
     WHERE t.test_id = ?`,
    [testId]
  );
  return rows[0] || null;
};

export const listTests = async (companyId, { status, search } = {}) => {
  const conds = ["t.company_id = ?"];
  const params = [companyId];
  if (status) { conds.push("t.status = ?"); params.push(status); }
  if (search) {
    conds.push("(t.name LIKE ? OR t.subject_a LIKE ? OR t.subject_b LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const [rows] = await db.query(
    `SELECT t.*, e.name AS creator_name
     FROM ab_tests t
     LEFT JOIN employees e ON e.emp_id = t.created_by
     WHERE ${conds.join(" AND ")}
     ORDER BY t.created_at DESC`,
    params
  );
  return rows;
};

export const updateTest = async (testId, data) => {
  const allowed = ["name", "subject_a", "body_a", "subject_b", "body_b", "split_pct", "status", "sent_at"];
  const fields = [], values = [];
  for (const k of allowed) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (!fields.length) return;
  values.push(testId);
  await db.query(`UPDATE ab_tests SET ${fields.join(", ")} WHERE test_id = ?`, values);
};

export const deleteTest = async (testId) => {
  await db.query(`DELETE FROM ab_tests WHERE test_id = ?`, [testId]);
};

/* ── counter helpers (atomic increments) ── */
export const incrementCounter = async (testId, column) => {
  const safe = ["opened_a", "opened_b", "clicked_a", "clicked_b", "replied_a", "replied_b"];
  if (!safe.includes(column)) throw new Error("Invalid counter column");
  await db.query(`UPDATE ab_tests SET ${column} = ${column} + 1 WHERE test_id = ?`, [testId]);
};

/* =====================================================
   RECIPIENTS
===================================================== */

/**
 * Bulk-insert recipients in one round-trip.
 * Each row: { test_id, contact_id, company_id, variant, tracking_token }
 */
export const bulkInsertRecipients = async (rows) => {
  if (!rows.length) return;
  const placeholders = rows.map(() => "(?, ?, ?, ?, ?)").join(", ");
  const params = rows.flatMap((r) => [r.test_id, r.contact_id, r.company_id, r.variant, r.tracking_token]);
  await db.query(
    `INSERT INTO ab_test_recipients (test_id, contact_id, company_id, variant, tracking_token)
     VALUES ${placeholders}`,
    params
  );
};

export const getRecipientsByTest = async (testId) => {
  const [rows] = await db.query(
    `SELECT r.*, c.name AS contact_name, c.email AS contact_email, c.status AS contact_stage
     FROM ab_test_recipients r
     JOIN contacts c ON c.contact_id = r.contact_id
     WHERE r.test_id = ?
     ORDER BY r.variant, r.created_at`,
    [testId]
  );
  return rows;
};

export const getRecipientByToken = async (token) => {
  const [rows] = await db.query(
    `SELECT r.*, t.test_id, t.company_id AS test_company_id
     FROM ab_test_recipients r
     JOIN ab_tests t ON t.test_id = r.test_id
     WHERE r.tracking_token = ?`,
    [token]
  );
  return rows[0] || null;
};

export const updateRecipient = async (recipientId, data) => {
  const allowed = ["email_id", "opened", "opened_at", "clicked", "clicked_at", "replied", "replied_at", "sent_at"];
  const fields = [], values = [];
  for (const k of allowed) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (!fields.length) return;
  values.push(recipientId);
  await db.query(`UPDATE ab_test_recipients SET ${fields.join(", ")} WHERE recipient_id = ?`, values);
};

/**
 * Batch-update sent_at + email_id for a list of recipients after sending.
 */
export const markRecipientsSent = async (updates) => {
  if (!updates.length) return;
  // Use a transaction for reliability
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const { recipientId, emailId, sentAt } of updates) {
      await conn.query(
        `UPDATE ab_test_recipients SET email_id = ?, sent_at = ? WHERE recipient_id = ?`,
        [emailId, sentAt, recipientId]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Fetch recipients that were sent an email but haven't been checked for replies yet.
 * For the background reply-detection pass.
 * Returns only recipients from SENT tests within the last 30 days.
 */
export const getRecipientsForReplyCheck = async () => {
  const [rows] = await db.query(
    `SELECT r.*, c.email AS contact_email, t.created_by AS emp_id
     FROM ab_test_recipients r
     JOIN contacts c ON c.contact_id = r.contact_id
     JOIN ab_tests  t ON t.test_id   = r.test_id
     WHERE r.replied = 0
       AND r.sent_at IS NOT NULL
       AND r.sent_at >= NOW() - INTERVAL 30 DAY
       AND t.status = 'SENT'
     ORDER BY r.sent_at ASC
     LIMIT 200`
  );
  return rows;
};

/* =====================================================
   LINK CLICK LOG
===================================================== */

export const logLinkClick = async ({ recipient_id, test_id, url }) => {
  await db.query(
    `INSERT INTO ab_test_link_clicks (recipient_id, test_id, url)
     VALUES (?, ?, ?)`,
    [recipient_id, test_id, url]
  );
};

export const getLinkClicksByTest = async (testId) => {
  const [rows] = await db.query(
    `SELECT lc.*, r.variant
     FROM ab_test_link_clicks lc
     JOIN ab_test_recipients r ON r.recipient_id = lc.recipient_id
     WHERE lc.test_id = ?
     ORDER BY lc.clicked_at DESC`,
    [testId]
  );
  return rows;
};
