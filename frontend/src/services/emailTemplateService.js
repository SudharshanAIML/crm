import api from './api';

/**
 * Email Template Service
 * Manages reusable email templates with dynamic variables
 */

// List templates (with optional filters)
export const getTemplates = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.targetStage) params.append('targetStage', filters.targetStage);
  if (filters.search) params.append('search', filters.search);
  if (filters.includeInactive) params.append('includeInactive', 'true');

  const response = await api.get(`/email-templates?${params.toString()}`);
  return response.data;
};

// Get single template
export const getTemplate = async (id) => {
  const response = await api.get(`/email-templates/${id}`);
  return response.data;
};

// Create template
export const createTemplate = async (data) => {
  const response = await api.post('/email-templates', data);
  return response.data;
};

// Update template
export const updateTemplate = async (id, data) => {
  const response = await api.put(`/email-templates/${id}`, data);
  return response.data;
};

// Delete template
export const deleteTemplate = async (id) => {
  const response = await api.delete(`/email-templates/${id}`);
  return response.data;
};

// Duplicate template
export const duplicateTemplate = async (id) => {
  const response = await api.post(`/email-templates/${id}/duplicate`);
  return response.data;
};

// Preview template with interpolated variables
export const previewTemplate = async (id, sampleData = {}) => {
  const response = await api.post(`/email-templates/${id}/preview`, sampleData);
  return response.data;
};

// Get available dynamic variables
export const getVariables = async () => {
  const response = await api.get('/email-templates/variables');
  return response.data;
};
