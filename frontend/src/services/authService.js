import api from './api';

/**
 * Login with Google OAuth
 * @param {string} token - Google OAuth token
 * @param {string} inviteToken - Optional invitation token for new employees
 * @param {boolean} isAdminRegistration - Whether this is a new admin registration
 */
export const googleLogin = async (token, inviteToken = null, isAdminRegistration = false) => {
  const payload = { token };
  if (inviteToken) {
    payload.inviteToken = inviteToken;
  }
  if (isAdminRegistration) {
    payload.isAdminRegistration = true;
  }
  const response = await api.post('/auth/google', payload);
  return response.data;
};

export const completeEmployeeProfile = async (profileData) => {
  const response = await api.post('/employees/complete-profile', profileData);
  return response.data;
};
