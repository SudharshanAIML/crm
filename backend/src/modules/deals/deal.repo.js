import { db } from "../../config/db.js";

/* ---------------------------------------------------
   CREATE DEAL
--------------------------------------------------- */
export const createDeal = async (data) => {
  const [result] = await db.query(
    `
    INSERT INTO deals (
      opportunity_id,
      deal_value,
      closed_by
    )
    VALUES (?, ?, ?)
    `,
    [
      data.opportunity_id,
      data.deal_value,
      data.closed_by,
    ]
  );

  return result.insertId;
};

/* ---------------------------------------------------
   GET DEAL BY ID
--------------------------------------------------- */
export const getById = async (dealId) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM deals
    WHERE deal_id = ?
    `,
    [dealId]
  );

  return rows[0];
};

/* ---------------------------------------------------
   GET DEAL BY OPPORTUNITY (UNIQUE CHECK)
--------------------------------------------------- */
export const getByOpportunityId = async (opportunityId) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM deals
    WHERE opportunity_id = ?
    LIMIT 1
    `,
    [opportunityId]
  );

  return rows[0];
};

/* ---------------------------------------------------
   GET DEALS BY COMPANY (ANALYTICS)
--------------------------------------------------- */
export const getByCompany = async (companyId) => {
  const [rows] = await db.query(
    `
    SELECT d.*
    FROM deals d
    JOIN opportunities o ON o.opportunity_id = d.opportunity_id
    JOIN contacts c ON c.contact_id = o.contact_id
    WHERE c.company_id = ?
    ORDER BY d.closed_at DESC
    `,
    [companyId]
  );

  return rows;
};

/* ---------------------------------------------------
   DELETE DEAL (RARE / ADMIN)
--------------------------------------------------- */
export const deleteDeal = async (dealId) => {
  await db.query(
    `
    DELETE FROM deals
    WHERE deal_id = ?
    `,
    [dealId]
  );
};
