import { db } from "../../config/db.js";

/* ---------------------------------------------------
   GET NOTIFICATIONS FOR EMPLOYEE
   Returns paginated notifications, most recent first
--------------------------------------------------- */
export const getNotifications = async (companyId, empId, { limit = 20, offset = 0, unreadOnly = false } = {}) => {
  let query = `
    SELECT * FROM notifications
    WHERE company_id = ? AND emp_id = ? AND is_archived = FALSE
  `;
  const params = [companyId, empId];

  if (unreadOnly) {
    query += ` AND is_read = FALSE`;
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await db.query(query, params);
  return rows;
};

/* ---------------------------------------------------
   GET UNREAD COUNT
   Fast count for badge number
--------------------------------------------------- */
export const getUnreadCount = async (companyId, empId) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM notifications
     WHERE company_id = ? AND emp_id = ? AND is_read = FALSE AND is_archived = FALSE`,
    [companyId, empId]
  );
  return rows[0].count;
};

/* ---------------------------------------------------
   CREATE NOTIFICATION
--------------------------------------------------- */
export const createNotification = async ({
  company_id,
  emp_id,
  type,
  title,
  message,
  entity_type,
  entity_id,
  priority = 5,
}) => {
  const [result] = await db.query(
    `INSERT INTO notifications 
     (company_id, emp_id, type, title, message, entity_type, entity_id, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [company_id, emp_id, type, title, message, entity_type, entity_id, priority]
  );
  return result.insertId;
};

/* ---------------------------------------------------
   MARK AS READ
--------------------------------------------------- */
export const markAsRead = async (notificationId, empId) => {
  const [result] = await db.query(
    `UPDATE notifications 
     SET is_read = TRUE, read_at = NOW()
     WHERE notification_id = ? AND emp_id = ?`,
    [notificationId, empId]
  );
  return result.affectedRows > 0;
};

/* ---------------------------------------------------
   MARK ALL AS READ
--------------------------------------------------- */
export const markAllAsRead = async (companyId, empId) => {
  const [result] = await db.query(
    `UPDATE notifications 
     SET is_read = TRUE, read_at = NOW()
     WHERE company_id = ? AND emp_id = ? AND is_read = FALSE`,
    [companyId, empId]
  );
  return result.affectedRows;
};

/* ---------------------------------------------------
   ARCHIVE NOTIFICATION (soft delete)
--------------------------------------------------- */
export const archiveNotification = async (notificationId, empId) => {
  const [result] = await db.query(
    `UPDATE notifications 
     SET is_archived = TRUE
     WHERE notification_id = ? AND emp_id = ?`,
    [notificationId, empId]
  );
  return result.affectedRows > 0;
};

/* ---------------------------------------------------
   DELETE OLD NOTIFICATIONS (cleanup job)
   Removes archived notifications older than 30 days
--------------------------------------------------- */
export const cleanupOldNotifications = async () => {
  const [result] = await db.query(
    `DELETE FROM notifications 
     WHERE is_archived = TRUE 
     AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );
  return result.affectedRows;
};

/* ---------------------------------------------------
   CHECK FOR UPCOMING TASK NOTIFICATIONS
   Called by a scheduled job to generate "due soon" notifications
--------------------------------------------------- */
export const getTasksDueSoon = async (hoursAhead = 24) => {
  const [rows] = await db.query(
    `SELECT t.task_id, t.company_id, t.emp_id, t.title, t.due_date, t.due_time,
            c.name as contact_name
     FROM tasks t
     LEFT JOIN contacts c ON c.contact_id = t.contact_id
     WHERE t.status = 'PENDING'
     AND t.due_date = CURDATE()
     AND t.due_time IS NOT NULL
     AND TIME(t.due_time) BETWEEN TIME(NOW()) AND TIME(DATE_ADD(NOW(), INTERVAL ? HOUR))
     AND NOT EXISTS (
       SELECT 1 FROM notifications n
       WHERE n.entity_type = 'TASK' 
       AND n.entity_id = t.task_id 
       AND n.type = 'TASK_DUE_SOON'
       AND n.created_at > DATE_SUB(NOW(), INTERVAL 4 HOUR)
     )`,
    [hoursAhead]
  );
  return rows;
};

