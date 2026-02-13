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

export const createChannel = async ({ name, description, isDefault = false }) => {
  const { data } = await api.post('/discuss/channels', { name, description, isDefault });
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

export const searchMessages = async (query) => {
  const { data } = await api.get('/discuss/search', { params: { q: query } });
  return data;
};
