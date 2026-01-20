import api from './api';

/**
 * Contact Service
 * Handles all contact-related API calls
 */

// Get contacts by status and filters
export const getContacts = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.temperature) params.append('temperature', filters.temperature);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());
  
  const response = await api.get(`/contacts?${params.toString()}`);
  return response.data;
};

// Get all contacts with employee info (Admin)
export const getAllContactsAdmin = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.temperature) params.append('temperature', filters.temperature);
  if (filters.assignedEmpId) params.append('assignedEmpId', filters.assignedEmpId.toString());
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());
  
  const response = await api.get(`/contacts/admin/all?${params.toString()}`);
  return response.data;
};

// Get single contact by ID
export const getContactById = async (contactId) => {
  const response = await api.get(`/contacts/${contactId}`);
  return response.data;
};

// Create new lead
export const createContact = async (contactData) => {
  const response = await api.post('/contacts', contactData);
  return response.data;
};

// Update contact
export const updateContact = async (contactId, updates) => {
  const response = await api.patch(`/contacts/${contactId}`, updates);
  return response.data;
};

// Global search across all stages
export const searchContacts = async (query, limit = 20) => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  const response = await api.get(`/contacts/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

// Promote LEAD to MQL
export const promoteToMQL = async (contactId) => {
  const response = await api.patch(`/contacts/${contactId}/promote-mql`);
  return response.data;
};

// Promote MQL to SQL
export const promoteToSQL = async (contactId) => {
  const response = await api.patch(`/contacts/${contactId}/promote-sql`);
  return response.data;
};

// Convert SQL to Opportunity
export const convertToOpportunity = async (contactId, expectedValue) => {
  const response = await api.post(`/contacts/${contactId}/opportunity`, {
    expectedValue,
  });
  return response.data;
};

// Close Deal - Convert Opportunity to Customer
export const closeDeal = async (opportunityId, dealValue, productName = null) => {
  const response = await api.post(`/contacts/opportunities/${opportunityId}/close`, {
    dealValue,
    productName,
  });
  return response.data;
};

// Convert Customer to Evangelist
export const convertToEvangelist = async (contactId) => {
  const response = await api.post(`/contacts/${contactId}/evangelist`);
  return response.data;
};

// Get contact financials (opportunities & deals)
export const getContactFinancials = async (contactId) => {
  const response = await api.get(`/contacts/${contactId}/financials`);
  return response.data;
};

// Move contact to DORMANT status
export const moveToDormant = async (contactId, reason = null) => {
  const response = await api.patch(`/contacts/${contactId}/dormant`, {
    reason,
  });
  return response.data;
};