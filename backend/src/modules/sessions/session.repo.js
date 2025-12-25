import { db } from "../../config/db.js";

/* ---------------------------------------------------
   CREATE SESSION
--------------------------------------------------- */
export const createSession = async (data) => {
  // Get next session number for this contact
  const sessionCount = await countByContact(data.contact_id);
  const sessionNo = sessionCount + 1;

  const [result] = await db.query(
    `
    INSERT INTO sessions (
      contact_id,
      emp_id,
      stage,
      mode_of_contact,
      session_no,
      rating,
      session_status,
      remarks
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.contact_id,
      data.emp_id,
      data.stage,
      data.mode_of_contact || "CALL",
      sessionNo,
      data.rating || null,
      data.session_status,
      data.remarks || data.feedback || null,
    ]
  );

  return result.insertId;
};

/* ---------------------------------------------------
   GET SESSION BY ID
--------------------------------------------------- */
export const getById = async (sessionId) => {
  const [rows] = await db.query(
    `SELECT * FROM sessions WHERE session_id = ?`,
    [sessionId]
  );
  return rows[0];
};

/* ---------------------------------------------------
   COUNT SESSIONS BY CONTACT (for session_no)
--------------------------------------------------- */
export const countByContact = async (contactId) => {
  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS count
    FROM sessions
    WHERE contact_id = ?
    `,
    [contactId]
  );

  return rows[0].count;
};

/* ---------------------------------------------------
   COUNT SESSIONS BY STAGE
--------------------------------------------------- */
export const countByStage = async (contactId, stage) => {
  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS count
    FROM sessions
    WHERE contact_id = ?
      AND stage = ?
    `,
    [contactId, stage]
  );

  return rows[0].count;
};

/* ---------------------------------------------------
   GET ALL SESSIONS FOR A CONTACT
--------------------------------------------------- */
export const getByContact = async (contactId) => {
  const [rows] = await db.query(
    `
    SELECT 
      s.*,
      e.name as employee_name
    FROM sessions s
    LEFT JOIN employees e ON s.emp_id = e.emp_id
    WHERE s.contact_id = ?
    ORDER BY s.created_at DESC
    `,
    [contactId]
  );

  return rows;
};

/* ---------------------------------------------------
   GET SESSIONS BY STAGE
--------------------------------------------------- */
export const getByStage = async (contactId, stage) => {
  const [rows] = await db.query(
    `
    SELECT 
      s.*,
      e.name as employee_name
    FROM sessions s
    LEFT JOIN employees e ON s.emp_id = e.emp_id
    WHERE s.contact_id = ?
      AND s.stage = ?
    ORDER BY s.created_at DESC
    `,
    [contactId, stage]
  );

  return rows;
};

/* ---------------------------------------------------
   UPDATE SESSION
--------------------------------------------------- */
export const updateSession = async (sessionId, updates) => {
  const fields = [];
  const values = [];

  if (updates.rating !== undefined) {
    fields.push("rating = ?");
    values.push(updates.rating);
  }

  if (updates.session_status) {
    fields.push("session_status = ?");
    values.push(updates.session_status);
  }

  if (updates.mode_of_contact) {
    fields.push("mode_of_contact = ?");
    values.push(updates.mode_of_contact);
  }

  if (updates.remarks !== undefined || updates.feedback !== undefined) {
    fields.push("remarks = ?");
    values.push(updates.remarks || updates.feedback);
  }

  if (fields.length === 0) return;

  values.push(sessionId);

  await db.query(
    `
    UPDATE sessions
    SET ${fields.join(", ")}
    WHERE session_id = ?
    `,
    values
  );
};

/* ---------------------------------------------------
   DELETE SESSION
--------------------------------------------------- */
export const deleteSession = async (sessionId) => {
  await db.query(`DELETE FROM sessions WHERE session_id = ?`, [sessionId]);
};

/* ---------------------------------------------------
   ANALYTICS: AVERAGE RATING BY STAGE
--------------------------------------------------- */
export const getAverageRating = async (contactId, stage) => {
  const [rows] = await db.query(
    `
    SELECT AVG(rating) AS avgRating
    FROM sessions
    WHERE contact_id = ?
      AND stage = ?
      AND rating IS NOT NULL
    `,
    [contactId, stage]
  );

  return rows[0].avgRating || 0;
};

/* ---------------------------------------------------
   ANALYTICS: OVERALL AVERAGE RATING (ALL SESSIONS)
--------------------------------------------------- */
export const getOverallAverageRating = async (contactId) => {
  const [rows] = await db.query(
    `
    SELECT AVG(rating) AS avgRating
    FROM sessions
    WHERE contact_id = ?
      AND rating IS NOT NULL
    `,
    [contactId]
  );

  return rows[0].avgRating || 0;
};