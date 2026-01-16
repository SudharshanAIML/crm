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
      temperature,
      source,
      interest_score
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.company_id,
      data.assigned_emp_id || null,
      data.name,
      data.email,
      data.phone || null,
      data.job_title || null,
      data.status,
      data.temperature || 'COLD',
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
   UPDATE CONTACT TEMPERATURE
--------------------------------------------------- */
export const updateTemperature = async (contactId, temperature) => {
  await db.query(
    `UPDATE contacts SET temperature = ? WHERE contact_id = ?`,
    [temperature, contactId]
  );
};

/* ---------------------------------------------------
   UPDATE CONTACT DETAILS
--------------------------------------------------- */
export const updateContact = async (contactId, updates) => {
  const fields = [];
  const values = [];

  if (updates.name) {
    fields.push("name = ?");
    values.push(updates.name);
  }

  if (updates.email) {
    fields.push("email = ?");
    values.push(updates.email);
  }

  if (updates.phone !== undefined) {
    fields.push("phone = ?");
    values.push(updates.phone);
  }

  if (updates.job_title !== undefined) {
    fields.push("job_title = ?");
    values.push(updates.job_title);
  }

  if (updates.temperature) {
    fields.push("temperature = ?");
    values.push(updates.temperature);
  }

  if (fields.length === 0) return;

  values.push(contactId);

  await db.query(
    `UPDATE contacts SET ${fields.join(", ")} WHERE contact_id = ?`,
    values
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
    SELECT 
      c.*,
      COALESCE(AVG(s.rating), 0) as average_rating,
      COUNT(DISTINCT s.session_id) as total_sessions,
      (SELECT s2.rating FROM sessions s2 WHERE s2.contact_id = c.contact_id ORDER BY s2.created_at DESC LIMIT 1) as latest_rating
    FROM contacts c
    LEFT JOIN sessions s ON c.contact_id = s.contact_id
    WHERE c.status = ?
      AND c.company_id = ?
    GROUP BY c.contact_id
    ORDER BY c.created_at DESC
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
    SELECT 
      c.*,
      COALESCE(AVG(s.rating), 0) as average_rating,
      COUNT(DISTINCT s.session_id) as total_sessions,
      (SELECT s2.rating FROM sessions s2 WHERE s2.contact_id = c.contact_id ORDER BY s2.created_at DESC LIMIT 1) as latest_rating
    FROM contacts c
    LEFT JOIN sessions s ON c.contact_id = s.contact_id
    WHERE c.company_id = ?
    GROUP BY c.contact_id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [companyId, limit, offset]
  );

  return rows;
};

/* ---------------------------------------------------
   SEARCH CONTACTS GLOBALLY (ALL STAGES)
--------------------------------------------------- */
export const searchContacts = async (companyId, searchTerm, limit = 20) => {
  const term = `%${searchTerm}%`;
  const [rows] = await db.query(
    `
    SELECT 
      c.contact_id,
      c.name,
      c.email,
      c.phone,
      c.status,
      c.temperature,
      c.job_title
    FROM contacts c
    WHERE c.company_id = ?
      AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)
    ORDER BY 
      CASE WHEN c.name LIKE ? THEN 0 ELSE 1 END,
      c.name ASC
    LIMIT ?
    `,
    [companyId, term, term, term, term, limit]
  );

  return rows;
};

/* ---------------------------------------------------
   GET ALL CONTACTS WITH EMPLOYEE INFO (ADMIN)
--------------------------------------------------- */
export const getAllWithEmployeeInfo = async (companyId, filters = {}) => {
  let query = `
    SELECT 
      c.*,
      e.name as assigned_emp_name,
      e.email as assigned_emp_email,
      COALESCE(AVG(s.rating), 0) as average_rating,
      COUNT(DISTINCT s.session_id) as total_sessions,
      MAX(s.created_at) as last_contacted,
      (SELECT s2.rating FROM sessions s2 WHERE s2.contact_id = c.contact_id ORDER BY s2.created_at DESC LIMIT 1) as latest_rating
    FROM contacts c
    LEFT JOIN employees e ON c.assigned_emp_id = e.emp_id
    LEFT JOIN sessions s ON c.contact_id = s.contact_id
    WHERE c.company_id = ?
  `;
  
  const params = [companyId];
  
  if (filters.status) {
    query += ` AND c.status = ?`;
    params.push(filters.status);
  }
  
  if (filters.temperature) {
    query += ` AND c.temperature = ?`;
    params.push(filters.temperature);
  }
  
  if (filters.assignedEmpId) {
    query += ` AND c.assigned_emp_id = ?`;
    params.push(filters.assignedEmpId);
  }
  
  if (filters.search) {
    query += ` AND (c.name LIKE ? OR c.email LIKE ?)`;
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  query += `
    GROUP BY c.contact_id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  params.push(filters.limit || 100, filters.offset || 0);
  
  const [rows] = await db.query(query, params);
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
