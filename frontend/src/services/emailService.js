import api from './api';

/**
 * Email Service
 * Handles all email-related API calls including Gmail OAuth
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