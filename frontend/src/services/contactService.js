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

// Bulk import contacts
export const importContacts = async (file, defaultStatus) => {
  const form = new FormData();
  form.append('file', file);
  const qs = defaultStatus ? `?defaultStatus=${encodeURIComponent(defaultStatus)}` : '';
  const response = await api.post(`/contacts/admin/import${qs}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Bulk export (returns blob)
export const exportContacts = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const response = await api.get(`/contacts/admin/export?${q}`, { responseType: 'blob' });
  return response.data;
};

/* ---------------------------------------------------
   AVAILABILITY MANAGEMENT
--------------------------------------------------- */

// Get all availability windows for a contact
export const getContactAvailability = async (contactId) => {
  const response = await api.get(`/contacts/${contactId}/availability`);
  return response.data;
};

// Get today's availability for a contact
export const getTodayAvailability = async (contactId) => {
  const response = await api.get(`/contacts/${contactId}/availability/today`);
  return response.data;
};

// Add a new availability window
export const createAvailabilityWindow = async (contactId, windowData) => {
  const response = await api.post(`/contacts/${contactId}/availability`, windowData);
  return response.data;
};

// Update an availability window
export const updateAvailabilityWindow = async (contactId, availabilityId, updates) => {
  const response = await api.put(`/contacts/${contactId}/availability/${availabilityId}`, updates);
  return response.data;
};

// Delete an availability window
export const deleteAvailabilityWindow = async (contactId, availabilityId) => {
  const response = await api.delete(`/contacts/${contactId}/availability/${availabilityId}`);
  return response.data;
};

// Set complete weekly schedule (replaces all existing)
export const setWeeklySchedule = async (contactId, schedule) => {
  const response = await api.post(`/contacts/${contactId}/availability/weekly`, { schedule });
  return response.data;
};

// Set default business hours (Mon-Fri 9-5)
export const setDefaultBusinessHours = async (contactId, timezone = 'UTC') => {
  const response = await api.post(`/contacts/${contactId}/availability/default`, { timezone });
  return response.data;
};