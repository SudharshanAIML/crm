import { db as pool } from '../../config/db.js';

/**
 * Create a call log entry
 */
export const createCallLog = async (callData) => {
  const {
    contact_id,
    employee_id,
    direction,
    call_sid,
    from_number,
    to_number,
    status,
  } = callData;

  const [result] = await pool.query(
    `INSERT INTO call_logs 
    (contact_id, employee_id, direction, call_sid, from_number, to_number, status, started_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [contact_id, employee_id, direction, call_sid, from_number, to_number, status]
  );

  return result.insertId;
};

/**
 * Update call log status
 */
export const updateCallLogStatus = async (callSid, updateData) => {
  const { status, duration, ended_at, recording_url } = updateData;
  
  const fields = [];
  const values = [];

  if (status) {
    fields.push('status = ?');
    values.push(status);
  }
  if (duration !== undefined) {
    fields.push('duration = ?');
    values.push(duration);
  }
  if (ended_at) {
    fields.push('ended_at = ?');
    values.push(ended_at);
  }
  if (recording_url) {
    fields.push('recording_url = ?');
    values.push(recording_url);
  }

  if (fields.length === 0) return 0;

  values.push(callSid);

  const [result] = await pool.query(
    `UPDATE call_logs SET ${fields.join(', ')} WHERE call_sid = ?`,
    values
  );

  return result.affectedRows;
};

/**
 * Get call log by Call SID
 */
export const getCallLogBySid = async (callSid) => {
  const [rows] = await pool.query(
    `SELECT cl.*, 
            c.name as contact_name, 
            c.email as contact_email,
            e.name as employee_name
     FROM call_logs cl
     JOIN contacts c ON cl.contact_id = c.contact_id
     JOIN employees e ON cl.employee_id = e.emp_id
     WHERE cl.call_sid = ?`,
    [callSid]
  );

  return rows[0];
};

/**
 * Get call logs by contact ID
 */
export const getCallLogsByContact = async (contactId, limit = 50, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT cl.*, 
            e.name as employee_name
     FROM call_logs cl
     JOIN employees e ON cl.employee_id = e.emp_id
     WHERE cl.contact_id = ?
     ORDER BY cl.created_at DESC
     LIMIT ? OFFSET ?`,
    [contactId, limit, offset]
  );

  return rows;
};

/**
 * Get call logs by employee ID
 */
export const getCallLogsByEmployee = async (employeeId, limit = 50, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT cl.*, 
            c.name as contact_name,
            c.email as contact_email,
            c.phone as contact_phone
     FROM call_logs cl
     JOIN contacts c ON cl.contact_id = c.contact_id
     WHERE cl.employee_id = ?
     ORDER BY cl.created_at DESC
     LIMIT ? OFFSET ?`,
    [employeeId, limit, offset]
  );

  return rows;
};

/**
 * Get all call logs with filters
 */
export const getAllCallLogs = async (filters = {}) => {
  const { status, employee_id, contact_id, direction, limit = 100, offset = 0 } = filters;
  
  let query = `
    SELECT cl.*, 
           c.name as contact_name,
           c.email as contact_email,
           c.phone as contact_phone,
           e.name as employee_name
    FROM call_logs cl
    JOIN contacts c ON cl.contact_id = c.contact_id
    JOIN employees e ON cl.employee_id = e.emp_id
    WHERE 1=1
  `;
  
  const params = [];

  if (status) {
    query += ' AND cl.status = ?';
    params.push(status);
  }
  if (employee_id) {
    query += ' AND cl.employee_id = ?';
    params.push(employee_id);
  }
  if (contact_id) {
    query += ' AND cl.contact_id = ?';
    params.push(contact_id);
  }
  if (direction) {
    query += ' AND cl.direction = ?';
    params.push(direction);
  }

  query += ' ORDER BY cl.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

/**
 * Add notes to a call log
 */
export const addCallNotes = async (callLogId, notes) => {
  const [result] = await pool.query(
    'UPDATE call_logs SET notes = ? WHERE call_log_id = ?',
    [notes, callLogId]
  );

  return result.affectedRows;
};

/**
 * Delete call log
 */
export const deleteCallLog = async (callLogId) => {
  const [result] = await pool.query('DELETE FROM call_logs WHERE call_log_id = ?', [callLogId]);
  return result.affectedRows;
};
