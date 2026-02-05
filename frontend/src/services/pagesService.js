/**
 * Outreach Pages Service
 * Handles API calls for the landing page builder feature
 */
import api from './api';

const BASE_URL = '/outreach/pages';

/* ---------------------------------------------------
   PAGE CRUD
--------------------------------------------------- */

/**
 * Create a new page
 */
export const createPage = async (pageData) => {
  const response = await api.post(BASE_URL, pageData);
  return response.data.data;
};

/**
 * Get all pages with optional filters
 */
export const getPages = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.createdBy) params.append('createdBy', filters.createdBy);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const response = await api.get(`${BASE_URL}?${params.toString()}`);
  return response.data.data;
};

/**
 * Get a single page by ID
 */
export const getPage = async (pageId) => {
  const response = await api.get(`${BASE_URL}/${pageId}`);
  return response.data.data;
};

/**
 * Update page metadata
 */
export const updatePage = async (pageId, updates) => {
  const response = await api.patch(`${BASE_URL}/${pageId}`, updates);
  return response.data.data;
};

/**
 * Delete a page
 */
export const deletePage = async (pageId) => {
  const response = await api.delete(`${BASE_URL}/${pageId}`);
  return response.data;
};

/**
 * Duplicate a page
 */
export const duplicatePage = async (pageId) => {
  const response = await api.post(`${BASE_URL}/${pageId}/duplicate`);
  return response.data.data;
};

/* ---------------------------------------------------
   COMPONENT OPERATIONS
--------------------------------------------------- */

/**
 * Add component to a page
 */
export const addComponent = async (pageId, componentData) => {
  const response = await api.post(`${BASE_URL}/${pageId}/components`, componentData);
  return response.data.data;
};

/**
 * Update a component
 */
export const updateComponent = async (pageId, componentId, updates) => {
  const response = await api.patch(`${BASE_URL}/${pageId}/components/${componentId}`, updates);
  return response.data.data;
};

/**
 * Delete a component
 */
export const deleteComponent = async (pageId, componentId) => {
  const response = await api.delete(`${BASE_URL}/${pageId}/components/${componentId}`);
  return response.data;
};

/**
 * Reorder components on a page
 */
export const reorderComponents = async (pageId, orders) => {
  const response = await api.put(`${BASE_URL}/${pageId}/components/reorder`, { orders });
  return response.data.data;
};

/* ---------------------------------------------------
   SHARING
--------------------------------------------------- */

/**
 * Share page with contacts
 */
export const shareWithContacts = async (pageId, contactIds) => {
  const response = await api.post(`${BASE_URL}/${pageId}/share`, { contactIds });
  return response.data.data;
};

/**
 * Get page sharing status
 */
export const getPageSharing = async (pageId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const response = await api.get(`${BASE_URL}/${pageId}/sharing?${params.toString()}`);
  return response.data.data;
};

/* ---------------------------------------------------
   ANALYTICS
--------------------------------------------------- */

/**
 * Get page analytics
 */
export const getPageAnalytics = async (pageId, days = 30) => {
  const response = await api.get(`${BASE_URL}/${pageId}/analytics?days=${days}`);
  return response.data.data;
};

/* ---------------------------------------------------
   FORM RESPONSES
--------------------------------------------------- */

/**
 * Get responses for a page
 */
export const getPageResponses = async (pageId, filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.componentId) params.append('componentId', filters.componentId);
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const response = await api.get(`${BASE_URL}/${pageId}/responses?${params.toString()}`);
  return response.data.data;
};

/**
 * Get all responses across pages
 */
export const getAllResponses = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.pageId) params.append('pageId', filters.pageId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const response = await api.get(`/outreach/responses?${params.toString()}`);
  return response.data.data;
};

/**
 * Get single response
 */
export const getResponse = async (responseId) => {
  const response = await api.get(`/outreach/responses/${responseId}`);
  return response.data.data;
};

/**
 * Update response status
 */
export const updateResponse = async (responseId, status, notes = null) => {
  const response = await api.patch(`/outreach/responses/${responseId}`, { status, notes });
  return response.data.data;
};

/**
 * Bulk update response status
 */
export const bulkUpdateResponses = async (responseIds, status) => {
  const response = await api.post('/outreach/responses/bulk-update', { responseIds, status });
  return response.data.data;
};

/**
 * Delete response
 */
export const deleteResponse = async (responseId) => {
  const response = await api.delete(`/outreach/responses/${responseId}`);
  return response.data;
};

/**
 * Export responses as CSV
 */
export const exportResponses = async (pageId, filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.componentId) params.append('componentId', filters.componentId);
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  
  const response = await api.get(`${BASE_URL}/${pageId}/responses/export?${params.toString()}`, {
    responseType: 'blob',
  });
  
  // Trigger download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `responses-page-${pageId}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/* ---------------------------------------------------
   PUBLIC PAGE ACCESS
--------------------------------------------------- */

/**
 * Publish a page
 */
export const publishPage = async (pageId) => {
  const response = await api.post(`${BASE_URL}/${pageId}/publish`);
  return response.data.data;
};

/**
 * Archive a page
 */
export const archivePage = async (pageId) => {
  const response = await api.post(`${BASE_URL}/${pageId}/archive`);
  return response.data.data;
};

/**
 * Update response status
 */
export const updateResponseStatus = async (pageId, responseId, status) => {
  const response = await api.patch(`${BASE_URL}/${pageId}/responses/${responseId}`, { status });
  return response.data.data;
};

/**
 * Get public page by slug (simplified)
 */
export const getPublicPage = async (slug) => {
  const response = await api.get(`/public/p/${slug}`);
  return response.data.data;
};

/**
 * Submit form on public page
 */
export const submitPageForm = async (slug, data) => {
  const response = await api.post(`/public/p/${slug}/submit`, data);
  return response.data.data;
};

/**
 * Get page by access token
 */
export const getPageByToken = async (token, utmParams = {}) => {
  const params = new URLSearchParams();
  
  if (utmParams.utm_source) params.append('utm_source', utmParams.utm_source);
  if (utmParams.utm_medium) params.append('utm_medium', utmParams.utm_medium);
  if (utmParams.utm_campaign) params.append('utm_campaign', utmParams.utm_campaign);
  if (utmParams.utm_term) params.append('utm_term', utmParams.utm_term);
  if (utmParams.utm_content) params.append('utm_content', utmParams.utm_content);
  
  const response = await api.get(`/public/pages/t/${token}?${params.toString()}`);
  return response.data.data;
};

/**
 * Submit form response (public)
 */
export const submitFormResponse = async (pageId, componentId, formData, contactId = null) => {
  const response = await api.post(`/public/pages/${pageId}/forms/${componentId}/submit`, {
    formData,
    contactId,
  });
  return response.data.data;
};

export default {
  createPage,
  getPages,
  getPage,
  updatePage,
  deletePage,
  duplicatePage,
  addComponent,
  updateComponent,
  deleteComponent,
  reorderComponents,
  shareWithContacts,
  getPageSharing,
  getPageAnalytics,
  getPageResponses,
  getAllResponses,
  getResponse,
  updateResponse,
  bulkUpdateResponses,
  deleteResponse,
  exportResponses,
  getPublicPage,
  getPageByToken,
  submitFormResponse,
};
