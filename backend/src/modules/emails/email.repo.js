import { db } from "../../config/db.js";

/* ---------------------------------------------------
   CREATE EMAIL RECORD
--------------------------------------------------- */
export const createEmail = async (data) => {
  const [result] = await db.query(
    `
    INSERT INTO emails (
      contact_id,
      emp_id,
      subject,
      body,
      tracking_token,
      clicked
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      data.contact_id,
      data.emp_id || null,
      data.subject,
      data.body,
      data.tracking_token,
      data.clicked || false,
    ]
  );

  return result.insertId;
};

/* ---------------------------------------------------
   GET EMAIL BY ID
--------------------------------------------------- */
export const getById = async (emailId) => {
  const [rows] = await db.query(
    `SELECT * FROM emails WHERE email_id = ?`,
    [emailId]
  );
  return rows[0];
};

/* ---------------------------------------------------
   GET EMAIL BY TRACKING TOKEN
--------------------------------------------------- */
export const getByTrackingToken = async (token) => {
  const [rows] = await db.query(
    `SELECT * FROM emails WHERE tracking_token = ?`,
    [token]
  );
  return rows[0];
};

/* ---------------------------------------------------
   MARK EMAIL AS CLICKED
--------------------------------------------------- */
export const markClicked = async (emailId) => {
  await db.query(
    `UPDATE emails SET clicked = TRUE WHERE email_id = ?`,
    [emailId]
  );
};

/* ---------------------------------------------------
   GET EMAILS BY CONTACT
--------------------------------------------------- */
export const getByContact = async (contactId) => {
  const [rows] = await db.query(
    `
    SELECT * FROM emails 
    WHERE contact_id = ?
    ORDER BY sent_at DESC
    `,
    [contactId]
  );
  return rows;
};

/* ---------------------------------------------------
   GET EMAILS BY EMPLOYEE
--------------------------------------------------- */
export const getByEmployee = async (empId) => {
  const [rows] = await db.query(
    `
    SELECT * FROM emails 
    WHERE emp_id = ?
    ORDER BY sent_at DESC
    `,
    [empId]
  );
  return rows;
};

/* ---------------------------------------------------
   DELETE EMAIL
--------------------------------------------------- */
export const deleteEmail = async (emailId) => {
  await db.query(`DELETE FROM emails WHERE email_id = ?`, [emailId]);
};

/* ---------------------------------------------------
   UPDATE GMAIL MESSAGE ID
--------------------------------------------------- */
export const updateGmailId = async (emailId, gmailMessageId) => {
  await db.query(
    `UPDATE emails SET gmail_message_id = ? WHERE email_id = ?`,
    [gmailMessageId, emailId]
  );
};
