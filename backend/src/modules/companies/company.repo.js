import { db } from "../../config/db.js";

/* ---------------------------------------------------
   CREATE COMPANY
--------------------------------------------------- */
export const createCompany = async (data) => {
  const [result] = await db.query(
    `
    INSERT INTO companies (
      company_name,
      domain,
      no_of_employees,
      email,
      phone,
      country
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      data.company_name,
      data.domain || null,
      data.no_of_employees || null,
      data.email || null,
      data.phone || null,
      data.country || null,
    ]
  );

  return result.insertId;
};

/* ---------------------------------------------------
   GET COMPANY BY ID
--------------------------------------------------- */
export const getById = async (companyId) => {
  const [rows] = await db.query(
    `SELECT * FROM companies WHERE company_id = ?`,
    [companyId]
  );
  return rows[0];
};

/* ---------------------------------------------------
   GET COMPANY BY DOMAIN
--------------------------------------------------- */
export const getByDomain = async (domain) => {
  const [rows] = await db.query(
    `SELECT * FROM companies WHERE domain = ?`,
    [domain]
  );
  return rows[0];
};

/* ---------------------------------------------------
   GET ALL COMPANIES
--------------------------------------------------- */
export const getAll = async (limit = 100, offset = 0) => {
  const [rows] = await db.query(
    `
    SELECT * FROM companies 
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
    [limit, offset]
  );
  return rows;
};

/* ---------------------------------------------------
   UPDATE COMPANY
--------------------------------------------------- */
export const updateCompany = async (companyId, updates) => {
  const fields = [];
  const values = [];

  if (updates.company_name) {
    fields.push("company_name = ?");
    values.push(updates.company_name);
  }

  if (updates.domain !== undefined) {
    fields.push("domain = ?");
    values.push(updates.domain);
  }

  if (updates.no_of_employees !== undefined) {
    fields.push("no_of_employees = ?");
    values.push(updates.no_of_employees);
  }

  if (updates.email !== undefined) {
    fields.push("email = ?");
    values.push(updates.email);
  }

  if (updates.phone !== undefined) {
    fields.push("phone = ?");
    values.push(updates.phone);
  }

  if (updates.country !== undefined) {
    fields.push("country = ?");
    values.push(updates.country);
  }

  if (fields.length === 0) return;

  values.push(companyId);

  await db.query(
    `UPDATE companies SET ${fields.join(", ")} WHERE company_id = ?`,
    values
  );
};

/* ---------------------------------------------------
   DELETE COMPANY
--------------------------------------------------- */
export const deleteCompany = async (companyId) => {
  await db.query(`DELETE FROM companies WHERE company_id = ?`, [companyId]);
};

/* ---------------------------------------------------
   COUNT TOTAL COMPANIES
--------------------------------------------------- */
export const countAll = async () => {
  const [rows] = await db.query(`SELECT COUNT(*) AS count FROM companies`);
  return rows[0].count;
};

/* ---------------------------------------------------
   SEARCH COMPANIES
--------------------------------------------------- */
export const search = async (query, limit = 50) => {
  const [rows] = await db.query(
    `
    SELECT * FROM companies 
    WHERE company_name LIKE ? OR domain LIKE ?
    ORDER BY company_name ASC
    LIMIT ?
    `,
    [`%${query}%`, `%${query}%`, limit]
  );
  return rows;
};
