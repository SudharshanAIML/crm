import { db } from "../../config/db.js";

/* =====================================================
   CHANNEL QUERIES
===================================================== */

/**
 * Create a new channel and auto-add the creator as member
 */
export const createChannel = async (companyId, name, description, isDefault, createdBy) => {
  const [result] = await db.execute(
    `INSERT INTO discuss_channels (company_id, name, description, is_default, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [companyId, name, description || null, isDefault ? 1 : 0, createdBy]
  );
  const channelId = result.insertId;

  // Auto-add creator as member
  await db.execute(
    `INSERT INTO discuss_channel_members (channel_id, emp_id) VALUES (?, ?)`,
    [channelId, createdBy]
  );

  // If default channel, add ALL employees in the company
  if (isDefault) {
    await db.execute(
      `INSERT IGNORE INTO discuss_channel_members (channel_id, emp_id)
       SELECT ?, emp_id FROM employees WHERE company_id = ? AND emp_id != ?`,
      [channelId, companyId, createdBy]
    );
  }

  return channelId;
};

/**
 * List channels the employee is a member of (with unread counts)
 */
export const getChannelsForEmployee = async (companyId, empId) => {
  const [rows] = await db.execute(
    `SELECT
       c.channel_id, c.name, c.description, c.is_default, c.created_by, c.created_at,
       cm.last_read_at,
       (SELECT COUNT(*) FROM discuss_messages m
        WHERE m.channel_id = c.channel_id
          AND m.is_deleted = FALSE
          AND m.created_at > cm.last_read_at) AS unread_count,
       (SELECT COUNT(*) FROM discuss_channel_members
        WHERE channel_id = c.channel_id) AS member_count
     FROM discuss_channels c
     JOIN discuss_channel_members cm ON cm.channel_id = c.channel_id AND cm.emp_id = ?
     WHERE c.company_id = ?
     ORDER BY c.is_default DESC, c.name ASC`,
    [empId, companyId]
  );
  return rows;
};

/**
 * Get a single channel by ID (with membership check)
 */
export const getChannelById = async (channelId, empId) => {
  const [rows] = await db.execute(
    `SELECT c.*, cm.last_read_at,
       (SELECT COUNT(*) FROM discuss_channel_members WHERE channel_id = c.channel_id) AS member_count
     FROM discuss_channels c
     LEFT JOIN discuss_channel_members cm ON cm.channel_id = c.channel_id AND cm.emp_id = ?
     WHERE c.channel_id = ?`,
    [empId, channelId]
  );
  return rows[0] || null;
};

/**
 * Get all channels in a company (for join/browse)
 */
export const getAllCompanyChannels = async (companyId) => {
  const [rows] = await db.execute(
    `SELECT c.*,
       (SELECT COUNT(*) FROM discuss_channel_members WHERE channel_id = c.channel_id) AS member_count
     FROM discuss_channels c
     WHERE c.company_id = ?
     ORDER BY c.is_default DESC, c.name ASC`,
    [companyId]
  );
  return rows;
};

/**
 * Update channel details
 */
export const updateChannel = async (channelId, name, description) => {
  await db.execute(
    `UPDATE discuss_channels SET name = ?, description = ? WHERE channel_id = ?`,
    [name, description || null, channelId]
  );
};

/**
 * Delete channel and cascade members/messages
 */
export const deleteChannel = async (channelId) => {
  // Delete mentions first (FK-safe order)
  await db.execute(
    `DELETE dm FROM discuss_mentions dm
     JOIN discuss_messages m ON m.message_id = dm.message_id
     WHERE m.channel_id = ?`,
    [channelId]
  );
  await db.execute(`DELETE FROM discuss_messages WHERE channel_id = ?`, [channelId]);
  await db.execute(`DELETE FROM discuss_channel_members WHERE channel_id = ?`, [channelId]);
  await db.execute(`DELETE FROM discuss_channels WHERE channel_id = ?`, [channelId]);
};

/* =====================================================
   MEMBER QUERIES
===================================================== */

export const addMember = async (channelId, empId) => {
  await db.execute(
    `INSERT IGNORE INTO discuss_channel_members (channel_id, emp_id) VALUES (?, ?)`,
    [channelId, empId]
  );
};

export const removeMember = async (channelId, empId) => {
  await db.execute(
    `DELETE FROM discuss_channel_members WHERE channel_id = ? AND emp_id = ?`,
    [channelId, empId]
  );
};

export const getChannelMembers = async (channelId) => {
  const [rows] = await db.execute(
    `SELECT e.emp_id, e.name, e.email, e.role, e.department, cm.joined_at
     FROM discuss_channel_members cm
     JOIN employees e ON e.emp_id = cm.emp_id
     WHERE cm.channel_id = ?
     ORDER BY e.name ASC`,
    [channelId]
  );
  return rows;
};

export const isMember = async (channelId, empId) => {
  const [rows] = await db.execute(
    `SELECT 1 FROM discuss_channel_members WHERE channel_id = ? AND emp_id = ?`,
    [channelId, empId]
  );
  return rows.length > 0;
};

export const updateLastRead = async (channelId, empId) => {
  await db.execute(
    `UPDATE discuss_channel_members SET last_read_at = NOW() WHERE channel_id = ? AND emp_id = ?`,
    [channelId, empId]
  );
};

/* =====================================================
   MESSAGE QUERIES
===================================================== */

/**
 * Create a message and return the full row with sender info
 */
export const createMessage = async (channelId, senderEmpId, content, parentMessageId) => {
  const [result] = await db.execute(
    `INSERT INTO discuss_messages (channel_id, sender_emp_id, content, parent_message_id)
     VALUES (?, ?, ?, ?)`,
    [channelId, senderEmpId, content, parentMessageId || null]
  );
  return result.insertId;
};

/**
 * Get messages for a channel with cursor-based pagination (newest first)
 * @param {number} channelId
 * @param {number} limit
 * @param {number|null} before - message_id cursor (fetch messages older than this)
 */
export const getMessages = async (channelId, limit = 50, before = null) => {
  // Ensure limit is a safe integer (prevent SQL injection)
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
  
  let query = `
    SELECT m.message_id, m.channel_id, m.sender_emp_id, m.content,
           m.parent_message_id, m.is_edited, m.is_deleted, m.created_at, m.updated_at,
           e.name AS sender_name, e.email AS sender_email, e.role AS sender_role
    FROM discuss_messages m
    JOIN employees e ON e.emp_id = m.sender_emp_id
    WHERE m.channel_id = ? AND m.is_deleted = FALSE`;
  const params = [channelId];

  if (before) {
    query += ` AND m.message_id < ?`;
    params.push(before);
  }

  // LIMIT cannot use placeholder in mysql2, use validated integer directly
  query += ` ORDER BY m.message_id DESC LIMIT ${safeLimit}`;

  const [rows] = await db.execute(query, params);
  return rows.reverse(); // return in chronological order
};

/**
 * Get a single message by ID
 */
export const getMessageById = async (messageId) => {
  const [rows] = await db.execute(
    `SELECT m.*, e.name AS sender_name, e.email AS sender_email
     FROM discuss_messages m
     JOIN employees e ON e.emp_id = m.sender_emp_id
     WHERE m.message_id = ?`,
    [messageId]
  );
  return rows[0] || null;
};

/**
 * Edit message content
 */
export const editMessage = async (messageId, content) => {
  await db.execute(
    `UPDATE discuss_messages SET content = ?, is_edited = TRUE WHERE message_id = ?`,
    [content, messageId]
  );
};

/**
 * Soft-delete a message
 */
export const softDeleteMessage = async (messageId) => {
  await db.execute(
    `UPDATE discuss_messages SET is_deleted = TRUE WHERE message_id = ?`,
    [messageId]
  );
};

/**
 * Get thread replies for a parent message
 */
export const getThreadReplies = async (parentMessageId, limit = 50) => {
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
  const [rows] = await db.execute(
    `SELECT m.*, e.name AS sender_name, e.email AS sender_email
     FROM discuss_messages m
     JOIN employees e ON e.emp_id = m.sender_emp_id
     WHERE m.parent_message_id = ? AND m.is_deleted = FALSE
     ORDER BY m.created_at ASC
     LIMIT ${safeLimit}`,
    [parentMessageId]
  );
  return rows;
};

/* =====================================================
   MENTION QUERIES
===================================================== */

/**
 * Bulk-insert mentions for a message
 * @param {number} messageId
 * @param {{ type: 'EMPLOYEE'|'DEAL', refId: number }[]} mentions
 */
export const createMentions = async (messageId, mentions) => {
  if (!mentions || mentions.length === 0) return;
  const values = mentions.map(() => "(?, ?, ?)").join(", ");
  const params = mentions.flatMap(m => [messageId, m.type, m.refId]);

  await db.execute(
    `INSERT INTO discuss_mentions (message_id, mention_type, ref_id) VALUES ${values}`,
    params
  );
};

/**
 * Get mentions for a message
 */
export const getMentionsForMessage = async (messageId) => {
  const [rows] = await db.execute(
    `SELECT dm.mention_id, dm.mention_type, dm.ref_id,
       CASE
         WHEN dm.mention_type = 'EMPLOYEE' THEN (SELECT name FROM employees WHERE emp_id = dm.ref_id)
         WHEN dm.mention_type = 'DEAL' THEN (SELECT product_name FROM deals WHERE deal_id = dm.ref_id)
       END AS ref_name
     FROM discuss_mentions dm
     WHERE dm.message_id = ?`,
    [messageId]
  );
  return rows;
};

/**
 * Get all messages where an employee was mentioned (across all channels)
 */
export const getMentionsForEmployee = async (empId, limit = 30) => {
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 30, 100));
  const [rows] = await db.execute(
    `SELECT m.message_id, m.channel_id, m.content, m.created_at,
       c.name AS channel_name,
       e.name AS sender_name
     FROM discuss_mentions dm
     JOIN discuss_messages m ON m.message_id = dm.message_id AND m.is_deleted = FALSE
     JOIN discuss_channels c ON c.channel_id = m.channel_id
     JOIN employees e ON e.emp_id = m.sender_emp_id
     WHERE dm.mention_type = 'EMPLOYEE' AND dm.ref_id = ?
     ORDER BY m.created_at DESC
     LIMIT ${safeLimit}`,
    [empId]
  );
  return rows;
};

/**
 * Search messages across channels the employee has access to
 */
export const searchMessages = async (companyId, empId, query, limit = 30) => {
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 30, 100));
  const [rows] = await db.execute(
    `SELECT m.message_id, m.channel_id, m.content, m.created_at,
       c.name AS channel_name,
       e.name AS sender_name
     FROM discuss_messages m
     JOIN discuss_channels c ON c.channel_id = m.channel_id AND c.company_id = ?
     JOIN discuss_channel_members cm ON cm.channel_id = m.channel_id AND cm.emp_id = ?
     JOIN employees e ON e.emp_id = m.sender_emp_id
     WHERE m.is_deleted = FALSE AND MATCH(m.content) AGAINST(? IN BOOLEAN MODE)
     ORDER BY m.created_at DESC
     LIMIT ${safeLimit}`,
    [companyId, empId, query]
  );
  return rows;
};

/**
 * Fallback search using LIKE (if FULLTEXT index not present)
 */
export const searchMessagesLike = async (companyId, empId, query, limit = 30) => {
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 30, 100));
  const [rows] = await db.execute(
    `SELECT m.message_id, m.channel_id, m.content, m.created_at,
       c.name AS channel_name,
       e.name AS sender_name
     FROM discuss_messages m
     JOIN discuss_channels c ON c.channel_id = m.channel_id AND c.company_id = ?
     JOIN discuss_channel_members cm ON cm.channel_id = m.channel_id AND cm.emp_id = ?
     JOIN employees e ON e.emp_id = m.sender_emp_id
     WHERE m.is_deleted = FALSE AND m.content LIKE ?
     ORDER BY m.created_at DESC
     LIMIT ${safeLimit}`,
    [companyId, empId, `%${query}%`]
  );
  return rows;
};
