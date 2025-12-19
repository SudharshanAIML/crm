import { db } from "../../config/db.js";

/* ---------------------------------------------------
   CREATE SESSION
--------------------------------------------------- */
export const createSession = async (data) => {
  await db.query(
    `
    INSERT INTO sessions (
      contact_id,
      emp_id,
      stage,
      session_no,
      rating,
      session_status,
      remarks
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.contact_id,
      data.emp_id,
      data.stage,
      data.session_no,
      data.rating || null,
      data.session_status,
      data.remarks || null,
    ]
  );
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
   COUNT SESSIONS BY STAGE (MAX 5 RULE)
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
    SELECT *
    FROM sessions
    WHERE contact_id = ?
    ORDER BY created_at ASC
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
    SELECT *
    FROM sessions
    WHERE contact_id = ?
      AND stage = ?
    ORDER BY created_at ASC
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

  if (updates.remarks !== undefined) {
    fields.push("remarks = ?");
    values.push(updates.remarks);
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
  await db.query(
    `DELETE FROM sessions WHERE session_id = ?`,
    [sessionId]
  );
};

/* ---------------------------------------------------
   ANALYTICS: AVERAGE RATING
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
