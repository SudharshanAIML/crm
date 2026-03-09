import { db } from "../../config/db.js";

/* ---------------------------------------------------
   CREATE TEMPLATE
--------------------------------------------------- */
export const create = async (data) => {
  const [result] = await db.query(
    `INSERT INTO email_templates
       (company_id, created_by, name, subject, body, category, target_stage)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.company_id,
      data.created_by,
      data.name,
      data.subject,
      data.body,
      data.category || "GENERAL",
      data.target_stage || null,
    ]
  );
  return result.insertId;
};

/* ---------------------------------------------------
   GET BY ID
--------------------------------------------------- */
export const getById = async (templateId) => {
  const [rows] = await db.query(
    `SELECT t.*, e.name AS creator_name
     FROM email_templates t
     LEFT JOIN employees e ON e.emp_id = t.created_by
     WHERE t.template_id = ?`,
    [templateId]
  );
  return rows[0] || null;
};

/* ---------------------------------------------------
   LIST TEMPLATES (company-scoped, with filters)
--------------------------------------------------- */
export const list = async (companyId, { category, targetStage, search, activeOnly = true } = {}) => {
  const conditions = ["t.company_id = ?"];
  const params = [companyId];

  if (activeOnly) {
    conditions.push("t.is_active = 1");
  }

  if (category) {
    conditions.push("t.category = ?");
    params.push(category);
  }

  if (targetStage) {
    conditions.push("(t.target_stage = ? OR t.target_stage IS NULL)");
    params.push(targetStage);
  }

  if (search) {
    conditions.push("(t.name LIKE ? OR t.subject LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like);
  }

  const [rows] = await db.query(
    `SELECT t.*, e.name AS creator_name
     FROM email_templates t
     LEFT JOIN employees e ON e.emp_id = t.created_by
     WHERE ${conditions.join(" AND ")}
     ORDER BY t.updated_at DESC`,
    params
  );
  return rows;
};

/* ---------------------------------------------------
   UPDATE TEMPLATE
--------------------------------------------------- */
export const update = async (templateId, data) => {
  const fields = [];
  const values = [];

  const allowed = ["name", "subject", "body", "category", "target_stage", "is_active"];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return;

  values.push(templateId);
  await db.query(
    `UPDATE email_templates SET ${fields.join(", ")} WHERE template_id = ?`,
    values
  );
};

/* ---------------------------------------------------
   DELETE TEMPLATE (soft: mark inactive)
--------------------------------------------------- */
export const softDelete = async (templateId) => {
  await db.query(
    `UPDATE email_templates SET is_active = 0 WHERE template_id = ?`,
    [templateId]
  );
};

/* ---------------------------------------------------
   HARD DELETE
--------------------------------------------------- */
export const hardDelete = async (templateId) => {
  await db.query(
    `DELETE FROM email_templates WHERE template_id = ?`,
    [templateId]
  );
};

/* ---------------------------------------------------
   INCREMENT USAGE COUNTER
--------------------------------------------------- */
export const incrementUsage = async (templateId) => {
  await db.query(
    `UPDATE email_templates SET usage_count = usage_count + 1 WHERE template_id = ?`,
    [templateId]
  );
};

/* ---------------------------------------------------
   DUPLICATE TEMPLATE
--------------------------------------------------- */
export const duplicate = async (templateId, empId) => {
  const [rows] = await db.query(
    `SELECT * FROM email_templates WHERE template_id = ?`,
    [templateId]
  );

  if (!rows[0]) return null;

  const src = rows[0];
  const [result] = await db.query(
    `INSERT INTO email_templates
       (company_id, created_by, name, subject, body, category, target_stage)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      src.company_id,
      empId,
      `${src.name} (Copy)`,
      src.subject,
      src.body,
      src.category,
      src.target_stage,
    ]
  );

  return result.insertId;
};
