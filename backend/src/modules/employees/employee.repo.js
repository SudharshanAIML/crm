import { db } from "../../config/db.js";

/* ---------------------------------------------------
   CREATE EMPLOYEE
--------------------------------------------------- */
export const createEmployee = async (data) => {
  const [result] = await db.query(
    `
    INSERT INTO employees (
      company_id,
      name,
      email,
      phone,
      role
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      data.company_id || null,
      data.name,
      data.email,
      data.phone || null,
      data.role || "EMPLOYEE",
    ]
  );

  return result.insertId;
};

/* ---------------------------------------------------
   GET EMPLOYEE BY ID
--------------------------------------------------- */
export const getById = async (empId) => {
  const [rows] = await db.query(
    `SELECT * FROM employees WHERE emp_id = ?`,
    [empId]
  );
  return rows[0];
};

/* ---------------------------------------------------
   GET EMPLOYEE BY EMAIL
--------------------------------------------------- */
export const getByEmail = async (email) => {
  const [rows] = await db.query(
    `SELECT * FROM employees WHERE email = ?`,
    [email]
  );
  return rows[0];
};

/* ---------------------------------------------------
   GET EMPLOYEES BY COMPANY
--------------------------------------------------- */
export const getByCompany = async (companyId) => {
  const [rows] = await db.query(
    `
    SELECT * FROM employees 
    WHERE company_id = ?
    ORDER BY created_at DESC
    `,
    [companyId]
  );
  return rows;
};

/* ---------------------------------------------------
   UPDATE EMPLOYEE
--------------------------------------------------- */
export const updateEmployee = async (empId, updates) => {
  const fields = [];
  const values = [];

  if (updates.name) {
    fields.push("name = ?");
    values.push(updates.name);
  }

  if (updates.phone !== undefined) {
    fields.push("phone = ?");
    values.push(updates.phone);
  }

  if (updates.role) {
    fields.push("role = ?");
    values.push(updates.role);
  }

  if (updates.company_id) {
    fields.push("company_id = ?");
    values.push(updates.company_id);
  }

  if (fields.length === 0) return;

  values.push(empId);

  await db.query(
    `UPDATE employees SET ${fields.join(", ")} WHERE emp_id = ?`,
    values
  );
};

/* ---------------------------------------------------
   DELETE EMPLOYEE
--------------------------------------------------- */
export const deleteEmployee = async (empId) => {
  await db.query(`DELETE FROM employees WHERE emp_id = ?`, [empId]);
};

/* ---------------------------------------------------
   COUNT EMPLOYEES BY COMPANY
--------------------------------------------------- */
export const countByCompany = async (companyId) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count FROM employees WHERE company_id = ?`,
    [companyId]
  );
  return rows[0].count;
};
