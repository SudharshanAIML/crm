import { db } from "../../config/db.js";

/* ---------------------------------------------------
   CREATE CONTACT
--------------------------------------------------- */
export const createContact = async (data) => {
  const [result] = await db.query(
    `
    INSERT INTO contacts (
      company_id,
      assigned_emp_id,
      name,
      email,
      phone,
      job_title,
      status,
      source,
      interest_score
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.company_id,
      data.assigned_emp_id || null,
      data.name,
      data.email,
      data.phone,
      data.job_title,
      data.status,
      data.source || null,
      data.interest_score || 0,
    ]
  );

  return result.insertId;
};

/* ---------------------------------------------------
   GET CONTACT BY ID
--------------------------------------------------- */
export const getById = async (contactId) => {
  const [rows] = await db.query(
    `SELECT * FROM contacts WHERE contact_id = ?`,
    [contactId]
  );

  return rows[0];
};

/* ---------------------------------------------------
   UPDATE CONTACT STATUS
--------------------------------------------------- */
export const updateStatus = async (contactId, status) => {
  await db.query(
    `UPDATE contacts SET status = ? WHERE contact_id = ?`,
    [status, contactId]
  );
};

/* ---------------------------------------------------
   STATUS HISTORY (AUDIT)
--------------------------------------------------- */
export const insertStatusHistory = async (
  contactId,
  oldStatus,
  newStatus,
  changedBy
) => {
  await db.query(
    `
    INSERT INTO contact_status_history (
      contact_id,
      old_status,
      new_status,
      changed_by
    )
    VALUES (?, ?, ?, ?)
    `,
    [contactId, oldStatus, newStatus, changedBy]
  );
};

/* ---------------------------------------------------
   TRACKING TOKEN (EMAIL CLICK SECURITY)
--------------------------------------------------- */
export const saveTrackingToken = async (contactId, token) => {
  await db.query(
    `UPDATE contacts SET tracking_token = ? WHERE contact_id = ?`,
    [token, contactId]
  );
};

/* ---------------------------------------------------
   INTEREST SCORE (MARKETING SIGNAL)
--------------------------------------------------- */
export const incrementInterestScore = async (contactId) => {
  await db.query(
    `
    UPDATE contacts
    SET interest_score = interest_score + 1
    WHERE contact_id = ?
    `,
    [contactId]
  );
};

/* ---------------------------------------------------
   ASSIGN EMPLOYEE (OPTIONAL)
--------------------------------------------------- */
export const assignEmployee = async (contactId, empId) => {
  await db.query(
    `
    UPDATE contacts
    SET assigned_emp_id = ?
    WHERE contact_id = ?
    `,
    [empId, contactId]
  );
};

/* ---------------------------------------------------
   LIST CONTACTS BY STATUS (DASHBOARDS)
--------------------------------------------------- */
export const getByStatus = async (status, companyId) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM contacts
    WHERE status = ?
      AND company_id = ?
    ORDER BY created_at DESC
    `,
    [status, companyId]
  );

  return rows;
};

/* ---------------------------------------------------
   GET ALL CONTACTS FOR COMPANY
--------------------------------------------------- */
export const getAll = async (companyId, limit = 50, offset = 0) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM contacts
    WHERE company_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
    [companyId, limit, offset]
  );

  return rows;
};

/* ---------------------------------------------------
   DELETE CONTACT (OPTIONAL / ADMIN)
--------------------------------------------------- */
export const deleteContact = async (contactId) => {
  await db.query(
    `DELETE FROM contacts WHERE contact_id = ?`,
    [contactId]
  );
};
