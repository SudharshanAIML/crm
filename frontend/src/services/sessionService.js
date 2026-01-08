import api from './api';

/**
 * Session Service
 * Handles all session/followup-related API calls
 */

// Get all sessions for a contact
export const getSessionsByContact = async (contactId) => {
  const response = await api.get(`/sessions/contact/${contactId}`);
  return response.data;
};

// Get sessions by stage for a specific contact
export const getSessionsByStage = async (contactId, stage) => {
  const response = await api.get(`/sessions/contact/${contactId}/${stage}`);
  return response.data;
};

// Get all sessions by stage (company-wide)
export const getAllSessionsByStage = async (stage, options = {}) => {
  const { limit = 100, offset = 0 } = options;
  const response = await api.get(`/sessions/stage/${stage}?limit=${limit}&offset=${offset}`);
  return response.data;
};

// Create new session
export const createSession = async (sessionData) => {
  const response = await api.post('/sessions', sessionData);
  return response.data;
};

// Update session
export const updateSession = async (sessionId, updates) => {
  const response = await api.patch(`/sessions/${sessionId}`, updates);
  return response.data;
};

// Delete session
export const deleteSession = async (sessionId) => {
  const response = await api.delete(`/sessions/${sessionId}`);
  return response.data;
};