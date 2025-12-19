import { db } from "../../config/db.js";

/* ---------------------------------------------------
   CREATE OPPORTUNITY
--------------------------------------------------- */
export const createOpportunity = async (data) => {
  const [result] = await db.query(
    `
    INSERT INTO opportunities (
      contact_id,
      emp_id,
      expected_value,
      status
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      data.contact_id,
      data.emp_id,
      data.expected_value,
      data.status || "OPEN",
    ]
  );

  return result.insertId;
};

/* ---------------------------------------------------
   GET OPPORTUNITY BY ID
--------------------------------------------------- */
export const getById = async (opportunityId) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM opportunities
    WHERE opportunity_id = ?
    `,
    [opportunityId]
  );

  return rows[0];
};

/* ---------------------------------------------------
   GET OPEN OPPORTUNITY BY CONTACT
--------------------------------------------------- */
export const getOpenByContact = async (contactId) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM opportunities
    WHERE contact_id = ?
      AND status = 'OPEN'
    LIMIT 1
    `,
    [contactId]
  );

  return rows[0];
};

/* ---------------------------------------------------
   UPDATE OPPORTUNITY STATUS (WON / LOST)
--------------------------------------------------- */
export const updateStatus = async (
  opportunityId,
  status,
  reason = null
) => {
  await db.query(
    `
    UPDATE opportunities
    SET status = ?, reason = ?
    WHERE opportunity_id = ?
    `,
    [status, reason, opportunityId]
  );
};

/* ---------------------------------------------------
   MARK OPPORTUNITY AS WON
--------------------------------------------------- */
export const markWon = async (opportunityId) => {
  await db.query(
    `UPDATE opportunities SET status = 'WON' WHERE opportunity_id = ?`,
    [opportunityId]
  );
};

/* ---------------------------------------------------
   LIST OPPORTUNITIES BY STATUS
--------------------------------------------------- */
export const getByStatus = async (status, companyId) => {
  const [rows] = await db.query(
    `
    SELECT o.*
    FROM opportunities o
    JOIN contacts c ON c.contact_id = o.contact_id
    WHERE o.status = ?
      AND c.company_id = ?
    ORDER BY o.created_at DESC
    `,
    [status, companyId]
  );

  return rows;
};

/* ---------------------------------------------------
   DELETE OPPORTUNITY (RARE / ADMIN)
--------------------------------------------------- */
export const deleteOpportunity = async (opportunityId) => {
  await db.query(
    `
    DELETE FROM opportunities
    WHERE opportunity_id = ?
    `,
    [opportunityId]
  );
};
