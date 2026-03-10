import { db } from "../../config/db.js";

/* =====================================================
   CHANNEL QUERIES
===================================================== */

/**
 * Create a new channel and auto-add the creator as member
 */
export const createChannel = async (companyId, name, description, isDefault, channelType, createdBy) => {
  const [result] = await db.execute(
    `INSERT INTO discuss_channels (company_id, name, description, is_default, channel_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [companyId, name, description || null, isDefault ? 1 : 0, channelType || 'PUBLIC', createdBy]
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
       c.channel_id, c.name, c.description, c.is_default, c.channel_type, c.created_by, c.created_at,
       cm.last_read_at,
       (SELECT COUNT(*) FROM discuss_messages m
        WHERE m.channel_id = c.channel_id
          AND m.is_deleted = FALSE
          AND m.created_at > cm.last_read_at) AS unread_count,
       (SELECT COUNT(*) FROM discuss_channel_members
        WHERE channel_id = c.channel_id) AS member_count
     FROM discuss_channels c
     JOIN discuss_channel_members cm ON cm.channel_id = c.channel_id AND cm.emp_id = ?
     WHERE c.company_id = ? AND c.channel_type != 'DM'
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
 * Get all PUBLIC channels in a company (for join/browse) — excludes PRIVATE channels
 */
export const getAllCompanyChannels = async (companyId) => {
  const [rows] = await db.execute(
    `SELECT c.*,
       (SELECT COUNT(*) FROM discuss_channel_members WHERE channel_id = c.channel_id) AS member_count
     FROM discuss_channels c
     WHERE c.company_id = ? AND c.channel_type = 'PUBLIC'
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
  // Delete in FK-safe order
  await db.execute(
    `DELETE dm FROM discuss_mentions dm
     JOIN discuss_messages m ON m.message_id = dm.message_id
     WHERE m.channel_id = ?`,
    [channelId]
  );
  await db.execute(`DELETE FROM discuss_messages WHERE channel_id = ?`, [channelId]);
  await db.execute(`DELETE FROM discuss_channel_members WHERE channel_id = ?`, [channelId]);
  await db.execute(`DELETE FROM discuss_channel_invitations WHERE channel_id = ?`, [channelId]);
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

/**
 * Bulk-add multiple employees to a channel (for invite flow)
 * @param {number} channelId
 * @param {number[]} empIds
 */
export const bulkAddMembers = async (channelId, empIds) => {
  if (!empIds || empIds.length === 0) return;
  const placeholders = empIds.map(() => "(?, ?)").join(", ");
  const params = empIds.flatMap(id => [channelId, id]);
  await db.execute(
    `INSERT IGNORE INTO discuss_channel_members (channel_id, emp_id) VALUES ${placeholders}`,
    params
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

/**
 * Get all company employees who are NOT yet members of a channel
 * Used for the invite search dropdown — org-isolated by companyId
 */
export const getCompanyEmployeesNotInChannel = async (companyId, channelId) => {
  const [rows] = await db.execute(
    `SELECT e.emp_id, e.name, e.email, e.role, e.department
     FROM employees e
     WHERE e.company_id = ?
       AND e.emp_id NOT IN (
         SELECT cm.emp_id FROM discuss_channel_members cm WHERE cm.channel_id = ?
       )
     ORDER BY e.name ASC`,
    [companyId, channelId]
  );
  return rows;
};

/* =====================================================
   INVITATION QUERIES
===================================================== */

/**
 * Record an invitation (upsert: if previously declined, re-open it)
 */
export const createInvitations = async (channelId, inviterEmpId, inviteeEmpIds) => {
  if (!inviteeEmpIds || inviteeEmpIds.length === 0) return;
  const placeholders = inviteeEmpIds.map(() => "(?, ?, ?)").join(", ");
  const params = inviteeEmpIds.flatMap(id => [channelId, inviterEmpId, id]);
  await db.execute(
    `INSERT INTO discuss_channel_invitations (channel_id, inviter_emp_id, invitee_emp_id)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE
       status = 'PENDING',
       inviter_emp_id = VALUES(inviter_emp_id),
       updated_at = NOW()`,
    params
  );
};

/**
 * Mark invitations as accepted when the employee is added
 */
export const acceptInvitations = async (channelId, inviteeEmpIds) => {
  if (!inviteeEmpIds || inviteeEmpIds.length === 0) return;
  const placeholders = inviteeEmpIds.map(() => "?").join(", ");
  await db.execute(
    `UPDATE discuss_channel_invitations
     SET status = 'ACCEPTED', updated_at = NOW()
     WHERE channel_id = ? AND invitee_emp_id IN (${placeholders})`,
    [channelId, ...inviteeEmpIds]
  );
};

/* =====================================================
   MESSAGE QUERIES
===================================================== */

/**
 * Create a message and return the full row with sender info
 */
export const createMessage = async (channelId, senderEmpId, content, parentMessageId, attachment = {}) => {
  const { url = null, type = null, name = null, size = null } = attachment;
  const [result] = await db.execute(
    `INSERT INTO discuss_messages (channel_id, sender_emp_id, content, parent_message_id, attachment_url, attachment_type, attachment_name, attachment_size)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [channelId, senderEmpId, content || null, parentMessageId || null, url, type, name, size]
  );
  return result.insertId;
};

/**
 * Get messages for a channel with cursor-based pagination (newest first)
 * Uses idx_channel_active composite index for performance
 */
export const getMessages = async (channelId, limit = 50, before = null) => {
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));

  let query = `
    SELECT m.message_id, m.channel_id, m.sender_emp_id, m.content,
           m.parent_message_id, m.is_edited, m.is_deleted, m.created_at, m.updated_at,
           m.attachment_url, m.attachment_type, m.attachment_name, m.attachment_size,
           e.name AS sender_name, e.email AS sender_email, e.role AS sender_role,
           (SELECT COUNT(*) FROM discuss_messages r
             WHERE r.parent_message_id = m.message_id AND r.is_deleted = FALSE) AS reply_count
    FROM discuss_messages m
    JOIN employees e ON e.emp_id = m.sender_emp_id
    WHERE m.channel_id = ? AND m.parent_message_id IS NULL AND m.is_deleted = FALSE`;
  const params = [channelId];

  if (before) {
    query += ` AND m.message_id < ?`;
    params.push(before);
  }

  query += ` ORDER BY m.message_id DESC LIMIT ${safeLimit}`;

  const [rows] = await db.execute(query, params);
  return rows.reverse(); // return in chronological order
};

/**
 * Get a single message by ID
 */
export const getMessageById = async (messageId) => {
  const [rows] = await db.execute(
    `SELECT m.*, e.name AS sender_name, e.email AS sender_email, e.role AS sender_role
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
    `SELECT m.*, e.name AS sender_name, e.email AS sender_email, e.role AS sender_role
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
 * Get all messages where an employee was mentioned (uses idx_ref_message composite index)
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
     ORDER BY m.message_id DESC
     LIMIT ${safeLimit}`,
    [empId]
  );
  return rows;
};

/**
 * Search messages across channels the employee has access to (FULLTEXT)
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
     ORDER BY m.message_id DESC
     LIMIT ${safeLimit}`,
    [companyId, empId, query]
  );
  return rows;
};

/* =====================================================
   PINNED MESSAGES
===================================================== */

/**
 * Return all pinned messages for a channel, newest pin first.
 * Joins to messages + employees so callers get a complete payload.
 * Hard-limited to 50 rows — prevents abuse, more than enough in practice.
 */
export const getPinnedMessages = async (channelId) => {
  const [rows] = await db.execute(
    `SELECT p.id AS pin_id, p.pinned_at, p.pinned_by,
       m.message_id, m.channel_id, m.sender_emp_id,
       m.content, m.created_at,
       m.attachment_url, m.attachment_type, m.attachment_name,
       e.name  AS sender_name,
       pb.name AS pinned_by_name
     FROM discuss_pinned_messages p
     JOIN discuss_messages m  ON m.message_id = p.message_id AND m.is_deleted = FALSE
     JOIN employees e         ON e.emp_id  = m.sender_emp_id
     JOIN employees pb        ON pb.emp_id = p.pinned_by
     WHERE p.channel_id = ?
     ORDER BY p.pinned_at DESC
     LIMIT 50`,
    [channelId]
  );
  return rows;
};

/**
 * Pin a message.  INSERT IGNORE silently skips duplicate pins.
 */
export const pinMessage = async (channelId, messageId, empId) => {
  await db.execute(
    `INSERT IGNORE INTO discuss_pinned_messages (channel_id, message_id, pinned_by)
     VALUES (?, ?, ?)`,
    [channelId, messageId, empId]
  );
};

/**
 * Unpin a message.
 */
export const unpinMessage = async (channelId, messageId) => {
  await db.execute(
    `DELETE FROM discuss_pinned_messages
     WHERE channel_id = ? AND message_id = ?`,
    [channelId, messageId]
  );
};

/* =====================================================
   EMOJI REACTIONS
===================================================== */

/**
 * Bulk-fetch reactions for an array of message IDs.
 * Returns a map: { [messageId]: [{ emoji, count, empIds }] }
 *
 * Single query using GROUP_CONCAT — O(1) round-trip regardless of batch size.
 * emp_ids come back as comma-separated strings and are parsed to int arrays.
 */
export const getReactionsForMessages = async (messageIds) => {
  if (!messageIds || messageIds.length === 0) return {};

  const placeholders = messageIds.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT   message_id,
              emoji,
              COUNT(*)              AS \`count\`,
              GROUP_CONCAT(emp_id)  AS emp_ids_str
     FROM     discuss_reactions
     WHERE    message_id IN (${placeholders})
     GROUP BY message_id, emoji`,
    messageIds
  );

  const map = {};
  for (const row of rows) {
    const mid = row.message_id;
    if (!map[mid]) map[mid] = [];
    map[mid].push({
      emoji:   row.emoji,
      count:   row.count,
      empIds:  row.emp_ids_str.split(',').map(Number),
    });
  }
  return map;
};

/**
 * Toggle a reaction (add if absent, remove if present).
 * Returns the updated reaction list for that message.
 */
export const toggleReaction = async (messageId, empId, emoji) => {
  const [existing] = await db.execute(
    `SELECT id FROM discuss_reactions
     WHERE message_id = ? AND emp_id = ? AND emoji = ?`,
    [messageId, empId, emoji]
  );

  if (existing.length > 0) {
    await db.execute(
      `DELETE FROM discuss_reactions
       WHERE message_id = ? AND emp_id = ? AND emoji = ?`,
      [messageId, empId, emoji]
    );
  } else {
    await db.execute(
      `INSERT INTO discuss_reactions (message_id, emp_id, emoji)
       VALUES (?, ?, ?)`,
      [messageId, empId, emoji]
    );
  }

  // Return updated aggregated reactions for this message
  const [rows] = await db.execute(
    `SELECT   emoji,
              COUNT(*)             AS \`count\`,
              GROUP_CONCAT(emp_id) AS emp_ids_str
     FROM     discuss_reactions
     WHERE    message_id = ?
     GROUP BY emoji`,
    [messageId]
  );

  return rows.map(r => ({
    emoji:   r.emoji,
    count:   r.count,
    empIds:  r.emp_ids_str.split(',').map(Number),
  }));
};

/**
 * Fallback search using LIKE (if FULLTEXT index not present)
 * @param {string|null} channelId - when provided, restricts results to that channel
 */
export const searchMessagesLike = async (companyId, empId, query, channelId = null, limit = 30) => {
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 30, 100));
  const params = [companyId, empId, `%${query}%`];
  let channelClause = '';
  if (channelId) {
    channelClause = 'AND m.channel_id = ?';
    params.push(channelId);
  }
  const [rows] = await db.execute(
    `SELECT m.message_id, m.channel_id, m.sender_emp_id, m.content, m.created_at,
       c.name AS channel_name,
       e.name AS sender_name
     FROM discuss_messages m
     JOIN discuss_channels c ON c.channel_id = m.channel_id AND c.company_id = ?
     JOIN discuss_channel_members cm ON cm.channel_id = m.channel_id AND cm.emp_id = ?
     JOIN employees e ON e.emp_id = m.sender_emp_id
     WHERE m.is_deleted = FALSE
       AND m.parent_message_id IS NULL
       AND m.content LIKE ?
       ${channelClause}
     ORDER BY m.message_id DESC
     LIMIT ${safeLimit}`,
    params
  );
  return rows;
};

/* =====================================================
   DISCUSS CALL LOG QUERIES
===================================================== */

/**
 * Create a call log entry when a call starts
 */
export const createCallLog = async (channelId, callerEmpId, callerName, channelName, companyId) => {
  const [result] = await db.execute(
    `INSERT INTO discuss_call_logs (channel_id, caller_emp_id, caller_name, channel_name, status, company_id)
     VALUES (?, ?, ?, ?, 'started', ?)`,
    [channelId, callerEmpId, callerName, channelName, companyId]
  );
  return result.insertId;
};

/**
 * End a call — update the most recent 'started' log for this channel
 */
export const endCallLog = async (channelId) => {
  const [rows] = await db.execute(
    `SELECT call_id, started_at FROM discuss_call_logs
     WHERE channel_id = ? AND status = 'started'
     ORDER BY call_id DESC LIMIT 1`,
    [channelId]
  );
  if (rows.length === 0) return null;

  const callId = rows[0].call_id;
  const startedAt = new Date(rows[0].started_at);
  const now = new Date();
  const duration = Math.round((now - startedAt) / 1000);

  await db.execute(
    `UPDATE discuss_call_logs SET status = 'completed', ended_at = NOW(), duration = ?
     WHERE call_id = ?`,
    [duration, callId]
  );
  return { callId, duration };
};

/**
 * Mark a call as missed (nobody picked up before timeout)
 */
export const missCallLog = async (channelId) => {
  const [rows] = await db.execute(
    `SELECT call_id FROM discuss_call_logs
     WHERE channel_id = ? AND status = 'started'
     ORDER BY call_id DESC LIMIT 1`,
    [channelId]
  );
  if (rows.length === 0) return null;

  await db.execute(
    `UPDATE discuss_call_logs SET status = 'missed', ended_at = NOW()
     WHERE call_id = ?`,
    [rows[0].call_id]
  );
  return rows[0].call_id;
};

/**
 * Get the active (started) call for a channel, if any
 */
export const getActiveCallForChannel = async (channelId) => {
  const [rows] = await db.execute(
    `SELECT call_id, channel_id, caller_emp_id, caller_name, channel_name, started_at
     FROM discuss_call_logs
     WHERE channel_id = ? AND status = 'started'
     ORDER BY call_id DESC LIMIT 1`,
    [channelId]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Get call logs for a channel (for display in chat)
 */
export const getCallLogsByChannel = async (channelId, limit = 50) => {
  const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
  const [rows] = await db.execute(
    `SELECT call_id, channel_id, caller_emp_id, caller_name, channel_name,
            status, started_at, ended_at, duration
     FROM discuss_call_logs
     WHERE channel_id = ?
     ORDER BY started_at DESC
     LIMIT ${safeLimit}`,
    [channelId]
  );
  return rows;
};

/* =====================================================
   DISCUSS CALL PARTICIPANT QUERIES (LiveKit webhook-driven)
===================================================== */

/**
 * Find the most recent active (started) call for a channel by room name.
 * Room names follow the pattern: call-{companyId}-{channelId}
 */
export const getActiveCallByRoomName = async (roomName) => {
  // Parse companyId and channelId from room name: call-{companyId}-{channelId}
  const parts = roomName.split("-");
  if (parts.length < 3) return null;
  const companyId = parseInt(parts[1]);
  const channelId = parseInt(parts[parts.length - 1]);
  if (isNaN(channelId) || isNaN(companyId)) return null;

  const [rows] = await db.execute(
    `SELECT call_id, channel_id, caller_emp_id, started_at, company_id
     FROM discuss_call_logs
     WHERE channel_id = ? AND company_id = ? AND status = 'started'
     ORDER BY call_id DESC LIMIT 1`,
    [channelId, companyId]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Mark a call as ongoing (room_started event from LiveKit)
 */
/**
 * Mark a call as ongoing (room_started event from LiveKit).
 * The row already has started_at = CURRENT_TIMESTAMP from the INSERT,
 * so we just refresh it to the actual LiveKit room-start time.
 */
export const markCallOngoing = async (callId) => {
  await db.execute(
    `UPDATE discuss_call_logs SET started_at = NOW() WHERE call_id = ? AND status = 'started'`,
    [callId]
  );
};

/**
 * End a call by call_id (room_finished event from LiveKit)
 */
export const endCallByRoomEvent = async (callId, startedAt) => {
  const now = new Date();
  const start = new Date(startedAt);
  // Guard against clock skew producing a negative duration
  const duration = Math.max(0, Math.round((now - start) / 1000));

  // Use status = 'started' in WHERE to make this idempotent —
  // if the socket "call:end" already completed it, this is a no-op.
  const [result] = await db.execute(
    `UPDATE discuss_call_logs SET status = 'completed', ended_at = NOW(), duration = ?
     WHERE call_id = ? AND status = 'started'`,
    [duration, callId]
  );
  return { callId, duration, updated: result.affectedRows > 0 };
};

/**
 * Record a participant joining a call
 */
export const addCallParticipant = async (callId, empId, identity) => {
  const [result] = await db.execute(
    `INSERT INTO discuss_call_participants (call_id, emp_id, identity, status, joined_at)
     VALUES (?, ?, ?, 'joined', NOW())`,
    [callId, empId, identity]
  );
  return result.insertId;
};

/**
 * Record a participant leaving a call
 */
export const markParticipantLeft = async (callId, empId) => {
  await db.execute(
    `UPDATE discuss_call_participants SET status = 'left', left_at = NOW()
     WHERE call_id = ? AND emp_id = ? AND status = 'joined'
     ORDER BY id DESC LIMIT 1`,
    [callId, empId]
  );
};

/**
 * Get participants for a specific call
 */
export const getCallParticipants = async (callId) => {
  const [rows] = await db.execute(
    `SELECT dcp.*, e.name as employee_name
     FROM discuss_call_participants dcp
     JOIN employees e ON dcp.emp_id = e.emp_id
     WHERE dcp.call_id = ?
     ORDER BY dcp.joined_at ASC`,
    [callId]
  );
  return rows;
};

/* =====================================================
   DIRECT MESSAGE (DM) QUERIES
===================================================== */

/**
 * Verify an employee belongs to a specific company.
 * Used by the DM service to ensure cross-company DMs are blocked.
 */
export const getEmployeeById = async (empId, companyId) => {
  const [[row]] = await db.execute(
    `SELECT emp_id, name, email FROM employees
     WHERE emp_id = ? AND company_id = ?`,
    [empId, companyId]
  );
  return row || null;
};

/**
 * Atomically get or create a DM channel between two employees.
 * IDs are sorted (smaller first) so the unique key uq_dm_pair fires correctly.
 * Returns the channel_id of the DM thread.
 */
export const getOrCreateDmChannel = async (companyId, empIdA, empIdB, createdBy) => {
  const emp1 = Math.min(empIdA, empIdB);
  const emp2 = Math.max(empIdA, empIdB);

  // INSERT IGNORE — if the pair already exists, nothing changes.
  // name is NULL for DMs so the uq_company_channel(company_id, name) unique key
  // doesn't block multiple DM pairs (NULL != NULL in MySQL unique indexes).
  await db.execute(
    `INSERT IGNORE INTO discuss_channels
       (company_id, name, channel_type, dm_emp1_id, dm_emp2_id, description, is_default, created_by)
     VALUES (?, NULL, 'DM', ?, ?, NULL, 0, ?)`,
    [companyId, emp1, emp2, createdBy]
  );

  // Always SELECT after — handles both the insert and the pre-existing cases
  const [[channel]] = await db.execute(
    `SELECT channel_id FROM discuss_channels
     WHERE company_id = ? AND dm_emp1_id = ? AND dm_emp2_id = ?`,
    [companyId, emp1, emp2]
  );

  const channelId = channel.channel_id;

  // Ensure both employees are members (INSERT IGNORE is idempotent)
  await db.execute(
    `INSERT IGNORE INTO discuss_channel_members (channel_id, emp_id)
     VALUES (?, ?), (?, ?)`,
    [channelId, emp1, channelId, emp2]
  );

  return channelId;
};

/**
 * List all DM channels for an employee with peer info + unread counts.
 * Returns peers ordered by most-recently-active first.
 */
export const getDmChannelsForEmployee = async (companyId, empId) => {
  const [rows] = await db.execute(
    `SELECT
       c.channel_id,
       c.dm_emp1_id,
       c.dm_emp2_id,
       c.channel_type,
       e.emp_id   AS peer_emp_id,
       e.name     AS peer_name,
       e.email    AS peer_email,
       cm.last_read_at,
       (SELECT COUNT(*) FROM discuss_messages m
        WHERE m.channel_id = c.channel_id
          AND m.is_deleted = FALSE
          AND m.created_at > cm.last_read_at) AS unread_count,
       (SELECT m2.created_at FROM discuss_messages m2
        WHERE m2.channel_id = c.channel_id AND m2.is_deleted = FALSE
        ORDER BY m2.created_at DESC LIMIT 1) AS last_message_at,
       (SELECT m3.content FROM discuss_messages m3
        WHERE m3.channel_id = c.channel_id AND m3.is_deleted = FALSE
        ORDER BY m3.created_at DESC LIMIT 1) AS last_message_preview
     FROM discuss_channels c
     JOIN discuss_channel_members cm ON cm.channel_id = c.channel_id AND cm.emp_id = ?
     -- join the PEER (the other person in the DM)
     JOIN employees e ON e.emp_id = IF(c.dm_emp1_id = ?, c.dm_emp2_id, c.dm_emp1_id)
     WHERE c.company_id = ? AND c.channel_type = 'DM'
     ORDER BY last_message_at DESC, c.channel_id DESC`,
    [empId, empId, companyId]
  );
  return rows;
};

/**
 * Get all employees in the company for the DM "new conversation" picker.
 * Excludes the requesting employee.
 */
export const getCompanyEmployees = async (companyId, excludeEmpId) => {
  const [rows] = await db.execute(
    `SELECT emp_id, name, email, role, department
     FROM employees
     WHERE company_id = ? AND emp_id != ?
     ORDER BY name ASC`,
    [companyId, excludeEmpId]
  );
  return rows;
};
