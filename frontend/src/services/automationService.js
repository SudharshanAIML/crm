import api from './api';

/* =====================================================
   AUTOMATION CRUD
===================================================== */

export const listAutomations = async (params = {}) => {
  const { data } = await api.get('/automations', { params });
  return data;
};

export const getAutomation = async (id) => {
  const { data } = await api.get(`/automations/${id}`);
  return data;
};

export const createAutomation = async (payload) => {
  const { data } = await api.post('/automations', payload);
  return data;
};

export const updateAutomation = async (id, payload) => {
  const { data } = await api.patch(`/automations/${id}`, payload);
  return data;
};

export const deleteAutomation = async (id) => {
  const { data } = await api.delete(`/automations/${id}`);
  return data;
};

export const toggleAutomation = async (id, active) => {
  const { data } = await api.patch(`/automations/${id}/toggle`, { active });
  return data;
};

/* =====================================================
   LOGS
===================================================== */

export const getAutomationLogs = async (id, params = {}) => {
  const { data } = await api.get(`/automations/${id}/logs`, { params });
  return data;
};

export const getCompanyLogs = async (params = {}) => {
  const { data } = await api.get('/automations/logs', { params });
  return data;
};

/* =====================================================
   ANALYTICS
===================================================== */

export const getAutomationAnalytics = async () => {
  const { data } = await api.get('/automations/analytics');
  return data;
};

/* =====================================================
   METADATA (for builder)
===================================================== */

export const getBuilderMetadata = async () => {
  const { data } = await api.get('/automations/metadata');
  return data;
};
