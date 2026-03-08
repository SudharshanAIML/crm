import { db } from "../../config/db.js";

/* =====================================================
   AUTOMATION CRUD
===================================================== */

export const create = async (data) => {
  const [result] = await db.query(
    `INSERT INTO automations
       (company_id, created_by, name, description, is_active, is_draft,
        trigger_type, trigger_config, workflow)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.company_id,
      data.created_by || null,
      data.name,
      data.description || null,
      data.is_active ? 1 : 0,
      data.is_draft ? 1 : 0,
      data.trigger_type,
      JSON.stringify(data.trigger_config || null),
      JSON.stringify(data.workflow || []),
    ]
  );
  return result.insertId;
};

export const getById = async (id) => {
  const [rows] = await db.query(
    `SELECT * FROM automations WHERE automation_id = ?`,
    [id]
  );
  const row = rows[0];
  if (row) {
    row.trigger_config = typeof row.trigger_config === "string" ? JSON.parse(row.trigger_config) : row.trigger_config;
    row.workflow = typeof row.workflow === "string" ? JSON.parse(row.workflow) : row.workflow;
  }
  return row || null;
};

export const listByCompany = async (companyId, { limit = 50, offset = 0, activeOnly = false } = {}) => {
  let query = `SELECT * FROM automations WHERE company_id = ?`;
  const params = [companyId];
  if (activeOnly) {
    query += ` AND is_active = 1 AND is_draft = 0`;
  }
  query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await db.query(query, params);
  return rows.map((r) => {
    r.trigger_config = typeof r.trigger_config === "string" ? JSON.parse(r.trigger_config) : r.trigger_config;
    r.workflow = typeof r.workflow === "string" ? JSON.parse(r.workflow) : r.workflow;
    return r;
  });
};

export const update = async (id, data) => {
  const fields = [];
  const values = [];

  const allowed = ["name", "description", "is_active", "is_draft", "trigger_type", "trigger_config", "workflow"];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      if (key === "trigger_config" || key === "workflow") {
        values.push(JSON.stringify(data[key]));
      } else if (key === "is_active" || key === "is_draft") {
        values.push(data[key] ? 1 : 0);
      } else {
        values.push(data[key]);
      }
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.query(`UPDATE automations SET ${fields.join(", ")} WHERE automation_id = ?`, values);
};

export const remove = async (id) => {
  await db.query(`DELETE FROM automation_logs WHERE automation_id = ?`, [id]);
  await db.query(`DELETE FROM automations WHERE automation_id = ?`, [id]);
};

export const incrementStats = async (id, success) => {
  const col = success ? "success_runs" : "failure_runs";
  await db.query(
    `UPDATE automations
     SET total_runs = total_runs + 1,
         ${col} = ${col} + 1,
         last_run_at = NOW()
     WHERE automation_id = ?`,
    [id]
  );
};

/* =====================================================
   FIND ACTIVE AUTOMATIONS BY TRIGGER TYPE
===================================================== */

export const findActiveByTrigger = async (companyId, triggerType) => {
  const [rows] = await db.query(
    `SELECT * FROM automations
     WHERE company_id = ? AND trigger_type = ? AND is_active = 1 AND is_draft = 0
     ORDER BY created_at ASC`,
    [companyId, triggerType]
  );
  return rows.map((r) => {
    r.trigger_config = typeof r.trigger_config === "string" ? JSON.parse(r.trigger_config) : r.trigger_config;
    r.workflow = typeof r.workflow === "string" ? JSON.parse(r.workflow) : r.workflow;
    return r;
  });
};

/* =====================================================
   EXECUTION LOGS
===================================================== */

export const insertLog = async (data) => {
  const [result] = await db.query(
    `INSERT INTO automation_logs
       (automation_id, company_id, trigger_type, trigger_entity_id,
        trigger_payload, status, steps, error_message, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.automation_id,
      data.company_id,
      data.trigger_type,
      data.trigger_entity_id || null,
      JSON.stringify(data.trigger_payload || null),
      data.status,
      JSON.stringify(data.steps || []),
      data.error_message || null,
      data.duration_ms || null,
    ]
  );
  return result.insertId;
};

export const getLogsByAutomation = async (automationId, { limit = 30, offset = 0 } = {}) => {
  const [rows] = await db.query(
    `SELECT * FROM automation_logs WHERE automation_id = ? ORDER BY executed_at DESC LIMIT ? OFFSET ?`,
    [automationId, limit, offset]
  );
  return rows.map((r) => {
    r.trigger_payload = typeof r.trigger_payload === "string" ? JSON.parse(r.trigger_payload) : r.trigger_payload;
    r.steps = typeof r.steps === "string" ? JSON.parse(r.steps) : r.steps;
    return r;
  });
};

export const getLogsByCompany = async (companyId, { limit = 50, offset = 0, status } = {}) => {
  let query = `SELECT l.*, a.name as automation_name
               FROM automation_logs l
               JOIN automations a ON a.automation_id = l.automation_id
               WHERE l.company_id = ?`;
  const params = [companyId];
  if (status) {
    query += ` AND l.status = ?`;
    params.push(status);
  }
  query += ` ORDER BY l.executed_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  const [rows] = await db.query(query, params);
  return rows.map((r) => {
    r.trigger_payload = typeof r.trigger_payload === "string" ? JSON.parse(r.trigger_payload) : r.trigger_payload;
    r.steps = typeof r.steps === "string" ? JSON.parse(r.steps) : r.steps;
    return r;
  });
};

/* =====================================================
   ANALYTICS HELPERS
===================================================== */

export const getAnalytics = async (companyId) => {
  const [[summary]] = await db.query(
    `SELECT
       COUNT(*) as total_automations,
       SUM(is_active = 1 AND is_draft = 0) as active_count,
       SUM(total_runs) as total_executions,
       SUM(success_runs) as total_success,
       SUM(failure_runs) as total_failure
     FROM automations WHERE company_id = ?`,
    [companyId]
  );

  const [triggerStats] = await db.query(
    `SELECT trigger_type, COUNT(*) as count, SUM(total_runs) as runs
     FROM automations WHERE company_id = ?
     GROUP BY trigger_type ORDER BY runs DESC`,
    [companyId]
  );

  const [recentLogs] = await db.query(
    `SELECT l.log_id, l.automation_id, a.name as automation_name,
            l.trigger_type, l.status, l.duration_ms, l.executed_at
     FROM automation_logs l
     JOIN automations a ON a.automation_id = l.automation_id
     WHERE l.company_id = ?
     ORDER BY l.executed_at DESC LIMIT 10`,
    [companyId]
  );

  return { summary, triggerStats, recentLogs };
};
