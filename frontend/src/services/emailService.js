import api from './api';

/**
 * Email Service
 * Handles all email-related API calls including Gmail OAuth and full Gmail integration
 */

// Send email to contact via connected Gmail
export const sendEmail = async ({ contactId, subject, body, cc, bcc }) => {
  const response = await api.post('/emails', {
    contactId,
    subject,
    body,
    cc,
    bcc,
  });
  return response.data;
};

// Get emails sent to a contact
export const getEmailsByContact = async (contactId) => {
  const response = await api.get(`/emails/contact/${contactId}`);
  return response.data;
};

// Check Gmail connection status
export const getConnectionStatus = async () => {
  const response = await api.get('/emails/connection-status');
  return response.data;
};

// Get URL to connect Gmail account
export const getConnectUrl = async () => {
  const response = await api.get('/emails/connect');
  return response.data;
};

// Disconnect Gmail account
export const disconnectEmail = async () => {
  const response = await api.delete('/emails/disconnect');
  return response.data;
};

/* ===================================================
   GMAIL INBOX/SENT/DRAFTS API
=================================================== */

// Get inbox messages
export const getGmailInbox = async ({ maxResults = 20, pageToken, q } = {}) => {
  const params = new URLSearchParams();
  if (maxResults) params.append('maxResults', maxResults);
  if (pageToken) params.append('pageToken', pageToken);
  if (q) params.append('q', q);
  
  const response = await api.get(`/emails/gmail/inbox?${params.toString()}`);
  return response.data;
};

// Get sent messages
export const getGmailSent = async ({ maxResults = 20, pageToken } = {}) => {
  const params = new URLSearchParams();
  if (maxResults) params.append('maxResults', maxResults);
  if (pageToken) params.append('pageToken', pageToken);
  
  const response = await api.get(`/emails/gmail/sent?${params.toString()}`);
  return response.data;
};

// Get CRM-sent emails only (emails sent via CRM with X-CRM-Sent header)
export const getGmailCRMSent = async ({ maxResults = 20, pageToken } = {}) => {
  const params = new URLSearchParams();
  if (maxResults) params.append('maxResults', maxResults);
  if (pageToken) params.append('pageToken', pageToken);
  
  const response = await api.get(`/emails/gmail/crm-sent?${params.toString()}`);
  return response.data;
};

// Get drafts
export const getGmailDrafts = async ({ maxResults = 20, pageToken } = {}) => {
  const params = new URLSearchParams();
  if (maxResults) params.append('maxResults', maxResults);
  if (pageToken) params.append('pageToken', pageToken);
  
  const response = await api.get(`/emails/gmail/drafts?${params.toString()}`);
  return response.data;
};

// Search Gmail messages
export const searchGmail = async (query, { maxResults = 20, pageToken } = {}) => {
  const params = new URLSearchParams();
  params.append('q', query);
  if (maxResults) params.append('maxResults', maxResults);
  if (pageToken) params.append('pageToken', pageToken);
  
  const response = await api.get(`/emails/gmail/search?${params.toString()}`);
  return response.data;
};

// Get single message with full content
export const getGmailMessage = async (messageId) => {
  const response = await api.get(`/emails/gmail/message/${messageId}`);
  return response.data;
};

// Mark message as read
export const markMessageRead = async (messageId) => {
  const response = await api.post(`/emails/gmail/message/${messageId}/read`);
  return response.data;
};

// Mark message as unread
export const markMessageUnread = async (messageId) => {
  const response = await api.post(`/emails/gmail/message/${messageId}/unread`);
  return response.data;
};

// Trash a message
export const trashGmailMessage = async (messageId) => {
  const response = await api.delete(`/emails/gmail/message/${messageId}`);
  return response.data;
};

// Get single draft with full content
export const getGmailDraft = async (draftId) => {
  const response = await api.get(`/emails/gmail/draft/${draftId}`);
  return response.data;
};

// Create a new draft
export const createGmailDraft = async ({ to, subject, body, cc, bcc }) => {
  const response = await api.post('/emails/gmail/drafts', {
    to,
    subject,
    body,
    cc,
    bcc,
  });
  return response.data;
};

// Update a draft
export const updateGmailDraft = async (draftId, { to, subject, body, cc, bcc }) => {
  const response = await api.put(`/emails/gmail/draft/${draftId}`, {
    to,
    subject,
    body,
    cc,
    bcc,
  });
  return response.data;
};

// Delete a draft
export const deleteGmailDraft = async (draftId) => {
  const response = await api.delete(`/emails/gmail/draft/${draftId}`);
  return response.data;
};

// Send a draft
export const sendGmailDraft = async (draftId) => {
  const response = await api.post(`/emails/gmail/draft/${draftId}/send`);
  return response.data;
};