import api from './api';

/**
 * Email Service
 * Handles all email-related API calls
 */

// Send email to contact
export const sendEmail = async ({ contactId, subject, body }) => {
  const response = await api.post('/emails', {
    contactId,
    subject,
    body,
  });
  return response.data;
};

// Get emails sent to a contact
export const getEmailsByContact = async (contactId) => {
  const response = await api.get(`/emails/contact/${contactId}`);
  return response.data;
};