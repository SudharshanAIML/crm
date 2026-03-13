import api from './api';

/* =====================================================
   DISCUSS SERVICE — REST API calls for team chat
===================================================== */

// ---- Channels ----

export const getMyChannels = async () => {
  const { data } = await api.get('/discuss/channels');
  return data;
};

export const browseChannels = async () => {
  const { data } = await api.get('/discuss/channels/browse');
  return data;
};

export const uploadAttachment = async (file) => {
  const form = new FormData();
  form.append('file', file, file.name || 'recording');
  const { data } = await api.post('/discuss/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { url, type, name, size }
};

export const createChannel = async ({ name, description, isDefault = false, channelType = 'PUBLIC' }) => {
  const { data } = await api.post('/discuss/channels', { name, description, isDefault, channelType });
  return data;
};

export const getChannel = async (channelId) => {
  const { data } = await api.get(`/discuss/channels/${channelId}`);
  return data;
};

export const updateChannel = async (channelId, updates) => {
  const { data } = await api.patch(`/discuss/channels/${channelId}`, updates);
  return data;
};

export const deleteChannel = async (channelId) => {
  const { data } = await api.delete(`/discuss/channels/${channelId}`);
  return data;
};

// ---- Members ----

export const joinChannel = async (channelId) => {
  const { data } = await api.post(`/discuss/channels/${channelId}/join`);
  return data;
};

export const leaveChannel = async (channelId) => {
  const { data } = await api.post(`/discuss/channels/${channelId}/leave`);
  return data;
};

export const getChannelMembers = async (channelId) => {
  const { data } = await api.get(`/discuss/channels/${channelId}/members`);
  return data;
};

export const markChannelRead = async (channelId) => {
  const { data } = await api.post(`/discuss/channels/${channelId}/read`);
  return data;
};

/**
 * Get employees in the same org who are not yet in this channel
 */
export const getInvitableEmployees = async (channelId) => {
  const { data } = await api.get(`/discuss/channels/${channelId}/invitable`);
  return data;
};

/**
 * Invite one or more employees to a channel by emp_id
 * @param {number} channelId
 * @param {number[]} empIds
 */
export const inviteToChannel = async (channelId, empIds) => {
  const { data } = await api.post(`/discuss/channels/${channelId}/invite`, { empIds });
  return data;
};

// ---- Messages ----

export const getMessages = async (channelId, { limit = 50, before = null } = {}) => {
  const params = { limit };
  if (before) params.before = before;
  const { data } = await api.get(`/discuss/channels/${channelId}/messages`, { params });
  return data;
};

export const sendMessage = async (channelId, { content, parentMessageId }) => {
  const { data } = await api.post(`/discuss/channels/${channelId}/messages`, { content, parentMessageId });
  return data;
};

export const editMessage = async (messageId, content) => {
  const { data } = await api.patch(`/discuss/messages/${messageId}`, { content });
  return data;
};

export const deleteMessage = async (messageId) => {
  const { data } = await api.delete(`/discuss/messages/${messageId}`);
  return data;
};

export const getThread = async (messageId) => {
  const { data } = await api.get(`/discuss/messages/${messageId}/thread`);
  return data;
};

// ---- Mentions & Search ----

export const getMyMentions = async () => {
  const { data } = await api.get('/discuss/mentions');
  return data;
};

export const searchMessages = async (query, channelId = null) => {
  const params = { q: query };
  if (channelId) params.channelId = channelId;
  const { data } = await api.get('/discuss/search', { params });
  return data;
};

// ---- Pinned Messages ----

export const getPins = async (channelId) => {
  const { data } = await api.get(`/discuss/channels/${channelId}/pins`);
  return data;
};

export const pinMessage = async (channelId, messageId) => {
  const { data } = await api.post(`/discuss/channels/${channelId}/pins`, { messageId });
  return data;
};

export const unpinMessage = async (channelId, messageId) => {
  const { data } = await api.delete(`/discuss/channels/${channelId}/pins/${messageId}`);
  return data;
};

// ---- LiveKit Calls ----

/**
 * Request a LiveKit access token for joining/starting a channel call.
 * @param {number} channelId
 * @returns {Promise<{ token: string, roomName: string, livekitUrl: string }>}
 */
export const requestCallToken = async (channelId) => {
  const { data } = await api.post(`/discuss/channels/${channelId}/call-token`);
  return data;
};

/**
 * Get whether the channel currently has an active call.
 * @param {number} channelId
 * @returns {Promise<{ active: boolean, call: object|null }>}
 */
export const getActiveCall = async (channelId) => {
  const { data } = await api.get(`/discuss/channels/${channelId}/call-active`);
  return data;
};

/**
 * Notify backend that the call has ended.
 * @param {number} channelId
 */
export const endCall = async (channelId) => {
  const { data } = await api.post(`/discuss/channels/${channelId}/call-end`);
  return data;
};

// ---- Direct Messages (DMs) ----

/**
 * Get all DM conversations for the authenticated employee.
 * @returns {Promise<Array<{channel_id, peer_emp_id, peer_name, peer_avatar, unread_count, last_message_at, last_message_preview}>>}
 */
export const getDmChannels = async () => {
  const { data } = await api.get('/discuss/dms');
  return data;
};

/**
 * Start or open an existing DM with the specified employee (idempotent).
 * @param {number} peerEmpId
 * @returns {Promise<{ channelId: number, peer: object }>}
 */
export const startDm = async (peerEmpId) => {
  const { data } = await api.post('/discuss/dms', { peerEmpId });
  return data;
};

/**
 * Get all active company employees for the new-DM picker.
 * @returns {Promise<Array<{ emp_id, name, email, profile_picture, role }>>}
 */
export const getDmEmployees = async () => {
  const { data } = await api.get('/discuss/dms/employees');
  return data;
};

