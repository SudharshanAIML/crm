import { db } from "../../config/db.js";

/* ---------------------------------------------------
   GET TASKS FOR CALENDAR (Date Range)
--------------------------------------------------- */
export const getTasksByDateRange = async (companyId, empId, startDate, endDate) => {
  const [rows] = await db.query(
    `SELECT 
       t.*,
       c.name as contact_name,
       c.email as contact_email,
       c.phone as contact_phone,
       c.status as contact_status
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.company_id = ? AND t.emp_id = ?
     AND t.due_date BETWEEN ? AND ?
     ORDER BY t.due_date ASC, t.due_time ASC`,
    [companyId, empId, startDate, endDate]
  );
  return rows;
};

/* ---------------------------------------------------
   GET TODAY'S TASKS
--------------------------------------------------- */
export const getTodaysTasks = async (companyId, empId) => {
  const [rows] = await db.query(
    `SELECT 
       t.*,
       c.name as contact_name,
       c.email as contact_email,
       c.phone as contact_phone,
       c.status as contact_status
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.company_id = ? AND t.emp_id = ?
     AND t.due_date = CURDATE()
     ORDER BY t.due_time ASC, t.priority DESC`,
    [companyId, empId]
  );
  return rows;
};

/* ---------------------------------------------------
   GET THIS WEEK'S TASKS
--------------------------------------------------- */
export const getWeeksTasks = async (companyId, empId) => {
  const [rows] = await db.query(
    `SELECT 
       t.*,
       c.name as contact_name,
       c.email as contact_email,
       c.phone as contact_phone,
       c.status as contact_status
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.company_id = ? AND t.emp_id = ?
     AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY t.due_date ASC, t.due_time ASC`,
    [companyId, empId]
  );
  return rows;
};

/* ---------------------------------------------------
   GET OVERDUE TASKS
--------------------------------------------------- */
export const getOverdueTasks = async (companyId, empId) => {
  const [rows] = await db.query(
    `SELECT 
       t.*,
       c.name as contact_name,
       c.email as contact_email,
       c.status as contact_status
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.company_id = ? AND t.emp_id = ?
     AND t.due_date < CURDATE()
     AND t.status NOT IN ('COMPLETED', 'CANCELLED')
     ORDER BY t.due_date ASC`,
    [companyId, empId]
  );
  
  // Update status to OVERDUE
  if (rows.length > 0) {
    await db.query(
      `UPDATE tasks 
       SET status = 'OVERDUE' 
       WHERE company_id = ? AND emp_id = ?
       AND due_date < CURDATE()
       AND status NOT IN ('COMPLETED', 'CANCELLED', 'OVERDUE')`,
      [companyId, empId]
    );
  }
  
  return rows;
};

/* ---------------------------------------------------
   GET UPCOMING TASKS (Next 7 days)
--------------------------------------------------- */
export const getUpcomingTasks = async (companyId, empId, limit = 10) => {
  const [rows] = await db.query(
    `SELECT 
       t.*,
       c.name as contact_name,
       c.email as contact_email,
       c.status as contact_status
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.company_id = ? AND t.emp_id = ?
     AND t.due_date >= CURDATE()
     AND t.status NOT IN ('COMPLETED', 'CANCELLED')
     ORDER BY t.due_date ASC, t.due_time ASC
     LIMIT ?`,
    [companyId, empId, limit]
  );
  return rows;
};

/* ---------------------------------------------------
   GET TASK BY ID
--------------------------------------------------- */
export const getTaskById = async (companyId, empId, taskId) => {
  const [rows] = await db.query(
    `SELECT 
       t.*,
       c.name as contact_name,
       c.email as contact_email,
       c.phone as contact_phone,
       c.status as contact_status
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.task_id = ? AND t.company_id = ? AND t.emp_id = ?`,
    [taskId, companyId, empId]
  );
  return rows[0];
};

/* ---------------------------------------------------
   CREATE TASK
--------------------------------------------------- */
export const createTask = async (taskData) => {
  const {
    company_id,
    emp_id,
    contact_id,
    title,
    description,
    task_type,
    priority,
    due_date,
    due_time,
    duration_minutes,
    is_all_day,
  } = taskData;

  const [result] = await db.query(
    `INSERT INTO tasks 
     (company_id, emp_id, contact_id, title, description, task_type, priority, due_date, due_time, duration_minutes, is_all_day)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [company_id, emp_id, contact_id || null, title, description || null, task_type, priority || 'MEDIUM', due_date, due_time || null, duration_minutes || 30, is_all_day || false]
  );

  return { task_id: result.insertId, ...taskData };
};

/* ---------------------------------------------------
   UPDATE TASK
--------------------------------------------------- */
export const updateTask = async (taskId, companyId, empId, updates) => {
  const allowedFields = ['title', 'description', 'task_type', 'priority', 'status', 'due_date', 'due_time', 'duration_minutes', 'is_all_day', 'contact_id'];
  
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (fields.length === 0) return null;
  
  // If completing task, set completed_at
  if (updates.status === 'COMPLETED') {
    fields.push('completed_at = NOW()');
  }
  
  values.push(taskId, companyId, empId);
  
  await db.query(
    `UPDATE tasks SET ${fields.join(', ')} WHERE task_id = ? AND company_id = ? AND emp_id = ?`,
    values
  );
  
  return getTaskById(companyId, empId, taskId);
};

/* ---------------------------------------------------
   DELETE TASK
--------------------------------------------------- */
export const deleteTask = async (taskId, companyId, empId) => {
  const [result] = await db.query(
    `DELETE FROM tasks WHERE task_id = ? AND company_id = ? AND emp_id = ?`,
    [taskId, companyId, empId]
  );
  return result.affectedRows > 0;
};

/* ---------------------------------------------------
   GET TASK STATS
--------------------------------------------------- */
export const getTaskStats = async (companyId, empId) => {
  const [stats] = await db.query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN status = 'PENDING' AND due_date = CURDATE() THEN 1 ELSE 0 END) as today_pending,
       SUM(CASE WHEN status = 'OVERDUE' OR (status = 'PENDING' AND due_date < CURDATE()) THEN 1 ELSE 0 END) as overdue,
       SUM(CASE WHEN status = 'PENDING' AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as this_week
     FROM tasks
     WHERE company_id = ? AND emp_id = ?`,
    [companyId, empId]
  );
  return stats[0];
};

/* ---------------------------------------------------
   GET TASKS BY CONTACT
--------------------------------------------------- */
export const getTasksByContact = async (companyId, empId, contactId) => {
  const [rows] = await db.query(
    `SELECT * FROM tasks 
     WHERE company_id = ? AND emp_id = ? AND contact_id = ?
     ORDER BY due_date DESC, due_time DESC`,
    [companyId, empId, contactId]
  );
  return rows;
};
