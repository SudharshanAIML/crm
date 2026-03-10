import { db } from "../../config/db.js";

/* =====================================================
   SEQUENCES
===================================================== */

export const createSequence = async ({ company_id, created_by, name, description }) => {
  const [r] = await db.query(
    `INSERT INTO sequences (company_id, created_by, name, description)
     VALUES (?, ?, ?, ?)`,
    [company_id, created_by, name.trim(), description?.trim() || null]
  );
  return r.insertId;
};

export const getSequenceById = async (sequenceId) => {
  const [rows] = await db.query(
    `SELECT s.*,
            e.name AS creator_name,
            COUNT(DISTINCT st.step_id) AS step_count
     FROM sequences s
     LEFT JOIN employees e  ON e.emp_id   = s.created_by
     LEFT JOIN sequence_steps st ON st.sequence_id = s.sequence_id
     WHERE s.sequence_id = ?
     GROUP BY s.sequence_id`,
    [sequenceId]
  );
  return rows[0] || null;
};

export const listSequences = async (companyId, { status, search } = {}) => {
  const conds = ["s.company_id = ?"];
  const params = [companyId];

  if (status) { conds.push("s.status = ?"); params.push(status); }
  if (search) {
    conds.push("(s.name LIKE ? OR s.description LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like);
  }

  const [rows] = await db.query(
    `SELECT s.*,
            e.name AS creator_name,
            COUNT(DISTINCT st.step_id) AS step_count
     FROM sequences s
     LEFT JOIN employees e        ON e.emp_id      = s.created_by
     LEFT JOIN sequence_steps st  ON st.sequence_id = s.sequence_id
     WHERE ${conds.join(" AND ")}
     GROUP BY s.sequence_id
     ORDER BY s.created_at DESC`,
    params
  );
  return rows;
};

export const updateSequence = async (sequenceId, data) => {
  const allowed = ["name", "description", "status"];
  const fields = [], values = [];
  for (const k of allowed) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (!fields.length) return;
  values.push(sequenceId);
  await db.query(`UPDATE sequences SET ${fields.join(", ")} WHERE sequence_id = ?`, values);
};

export const deleteSequence = async (sequenceId) => {
  await db.query(`DELETE FROM sequences WHERE sequence_id = ?`, [sequenceId]);
};

/* ─── counter helpers ─── */
export const incrementEnrollmentCount = async (sequenceId) => {
  await db.query(
    `UPDATE sequences SET enrollment_count = enrollment_count + 1 WHERE sequence_id = ?`,
    [sequenceId]
  );
};
export const incrementCompletedCount = async (sequenceId) => {
  await db.query(
    `UPDATE sequences SET completed_count = completed_count + 1 WHERE sequence_id = ?`,
    [sequenceId]
  );
};
export const incrementRepliedCount = async (sequenceId) => {
  await db.query(
    `UPDATE sequences SET replied_count = replied_count + 1 WHERE sequence_id = ?`,
    [sequenceId]
  );
};

/* =====================================================
   SEQUENCE STEPS
===================================================== */

export const upsertSteps = async (sequenceId, steps) => {
  // Delete existing steps then re-insert — simple & avoids partial-update complexity
  await db.query(`DELETE FROM sequence_steps WHERE sequence_id = ?`, [sequenceId]);
  if (!steps.length) return;

  const values = steps.map((s, i) => [
    sequenceId,
    i + 1,                          // step_order is 1-based
    s.delay_days ?? 0,
    s.subject.trim(),
    s.body.trim(),
    s.template_id || null,
  ]);

  await db.query(
    `INSERT INTO sequence_steps
       (sequence_id, step_order, delay_days, subject, body, template_id)
     VALUES ?`,
    [values]
  );
};

export const getStepsBySequence = async (sequenceId) => {
  const [rows] = await db.query(
    `SELECT * FROM sequence_steps
     WHERE sequence_id = ?
     ORDER BY step_order ASC`,
    [sequenceId]
  );
  return rows;
};

export const getStepById = async (stepId) => {
  const [rows] = await db.query(`SELECT * FROM sequence_steps WHERE step_id = ?`, [stepId]);
  return rows[0] || null;
};

/* =====================================================
   ENROLLMENTS
===================================================== */

export const createEnrollment = async ({
  sequence_id, contact_id, enrolled_by, company_id, next_send_at,
}) => {
  const [r] = await db.query(
    `INSERT INTO sequence_enrollments
       (sequence_id, contact_id, enrolled_by, company_id, status, current_step, next_send_at)
     VALUES (?, ?, ?, ?, 'ACTIVE', 0, ?)
     ON DUPLICATE KEY UPDATE
       status       = IF(status IN ('CANCELLED','COMPLETED'), 'ACTIVE', status),
       current_step = IF(status IN ('CANCELLED','COMPLETED'), 0, current_step),
       next_send_at = IF(status IN ('CANCELLED','COMPLETED'), VALUES(next_send_at), next_send_at),
       enrolled_at  = IF(status IN ('CANCELLED','COMPLETED'), CURRENT_TIMESTAMP, enrolled_at)`,
    [sequence_id, contact_id, enrolled_by, company_id, next_send_at]
  );
  return r.insertId || r.affectedRows;
};

export const getEnrollment = async (sequenceId, contactId) => {
  const [rows] = await db.query(
    `SELECT e.*,
            c.name AS contact_name, c.email AS contact_email
     FROM sequence_enrollments e
     JOIN contacts c ON c.contact_id = e.contact_id
     WHERE e.sequence_id = ? AND e.contact_id = ?`,
    [sequenceId, contactId]
  );
  return rows[0] || null;
};

export const listEnrollments = async (sequenceId, { status } = {}) => {
  const conds = ["e.sequence_id = ?"];
  const params = [sequenceId];
  if (status) { conds.push("e.status = ?"); params.push(status); }

  const [rows] = await db.query(
    `SELECT e.*,
            c.name AS contact_name, c.email AS contact_email, c.status AS contact_stage
     FROM sequence_enrollments e
     JOIN contacts c ON c.contact_id = e.contact_id
     WHERE ${conds.join(" AND ")}
     ORDER BY e.enrolled_at DESC`,
    params
  );
  return rows;
};

export const listEnrollmentsByContact = async (contactId) => {
  const [rows] = await db.query(
    `SELECT e.*, s.name AS sequence_name, s.status AS sequence_status
     FROM sequence_enrollments e
     JOIN sequences s ON s.sequence_id = e.sequence_id
     WHERE e.contact_id = ?
     ORDER BY e.enrolled_at DESC`,
    [contactId]
  );
  return rows;
};

export const updateEnrollment = async (enrollmentId, data) => {
  const allowed = ["status", "current_step", "next_send_at", "completed_at", "paused_at", "pause_reason"];
  const fields = [], values = [];
  for (const k of allowed) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (!fields.length) return;
  values.push(enrollmentId);
  await db.query(`UPDATE sequence_enrollments SET ${fields.join(", ")} WHERE enrollment_id = ?`, values);
};

export const cancelEnrollment = async (enrollmentId) => {
  await db.query(
    `UPDATE sequence_enrollments SET status = 'CANCELLED' WHERE enrollment_id = ?`,
    [enrollmentId]
  );
};

/**
 * Core scheduler query — fetch all active enrollments due for their next email.
 * LIMIT 100 per tick to prevent DB flood; scheduler loops through backlog over time.
 */
export const getDueEnrollments = async () => {
  const [rows] = await db.query(
    `SELECT e.*,
            c.name  AS contact_name,
            c.email AS contact_email,
            s.name  AS sequence_name
     FROM sequence_enrollments e
     JOIN contacts  c ON c.contact_id  = e.contact_id
     JOIN sequences s ON s.sequence_id = e.sequence_id
     WHERE e.status = 'ACTIVE'
       AND e.next_send_at IS NOT NULL
       AND e.next_send_at <= NOW()
     ORDER BY e.next_send_at ASC
     LIMIT 100`
  );
  return rows;
};

/* =====================================================
   EXECUTION LOG
===================================================== */

export const logExecution = async ({
  enrollment_id, step_id, contact_id, company_id, email_id, status, error_message,
}) => {
  await db.query(
    `INSERT INTO sequence_execution_log
       (enrollment_id, step_id, contact_id, company_id, email_id, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [enrollment_id, step_id, contact_id, company_id, email_id || null, status, error_message || null]
  );
};

export const getExecutionLog = async (enrollmentId) => {
  const [rows] = await db.query(
    `SELECT l.*, st.subject AS step_subject, st.step_order
     FROM sequence_execution_log l
     JOIN sequence_steps st ON st.step_id = l.step_id
     WHERE l.enrollment_id = ?
     ORDER BY l.executed_at ASC`,
    [enrollmentId]
  );
  return rows;
};
