import api from './api';

/**
 * Call Service
 * Handles all call-related API calls (Twilio integration)
 */

/**
 * Initiate a call to a contact
 * @param {number} contactId - Contact ID to call
 * @param {string} twilioPhoneNumber - Optional: specific Twilio number to use
 * @returns {Promise} Call initiation response
 */
export const initiateCall = async (contactId, twilioPhoneNumber = null) => {
  const response = await api.post('/calls', {
    contact_id: contactId,
    twilio_phone_number: twilioPhoneNumber,
  });
  return response.data;
};

/**
 * Get call history for a specific contact
 * @param {number} contactId - Contact ID
 * @param {number} limit - Number of records to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise} Call history array
 */
export const getContactCallHistory = async (contactId, limit = 50, offset = 0) => {
  const response = await api.get(`/calls/contact/${contactId}?limit=${limit}&offset=${offset}`);
  return response.data;
};

/**
 * Get my call history (logged-in employee)
 * @param {number} limit - Number of records to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise} Call history array
 */
export const getMyCallHistory = async (limit = 50, offset = 0) => {
  const response = await api.get(`/calls/my-calls?limit=${limit}&offset=${offset}`);
  return response.data;
};

/**
 * Get all calls with filters (Admin only)
 * @param {object} filters - Filter options
 * @returns {Promise} Filtered calls array
 */
export const getAllCalls = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.employee_id) params.append('employee_id', filters.employee_id);
  if (filters.contact_id) params.append('contact_id', filters.contact_id);
  if (filters.direction) params.append('direction', filters.direction);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());
  
  const response = await api.get(`/calls?${params.toString()}`);
  return response.data;
};

/**
 * Get call details by Call SID
 * @param {string} callSid - Twilio Call SID
 * @returns {Promise} Call details
 */
export const getCallDetails = async (callSid) => {
  const response = await api.get(`/calls/${callSid}`);
  return response.data;
};

/**
 * Cancel an ongoing call
 * @param {string} callSid - Twilio Call SID
 * @returns {Promise} Cancellation response
 */
export const cancelCall = async (callSid) => {
  const response = await api.post(`/calls/${callSid}/cancel`);
  return response.data;
};

/**
 * Add notes to a call log
 * @param {number} callLogId - Call log ID
 * @param {string} notes - Notes text
 * @returns {Promise} Update response
 */
export const addCallNotes = async (callLogId, notes) => {
  const response = await api.patch(`/calls/${callLogId}/notes`, { notes });
  return response.data;
};

export default {
  initiateCall,
  getContactCallHistory,
  getMyCallHistory,
  getAllCalls,
  getCallDetails,
  cancelCall,
  addCallNotes,
};
