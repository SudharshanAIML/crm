import api from "./api";

/**
 * Analytics Service - Handles all analytics API calls
 */

// Get comprehensive analytics for employee dashboard
export const getComprehensiveAnalytics = async () => {
  const response = await api.get("/analytics/comprehensive");
  return response.data;
};

// Get basic dashboard data
export const getDashboard = async () => {
  const response = await api.get("/analytics/dashboard");
  return response.data;
};

// Get pipeline funnel data
export const getPipelineFunnel = async () => {
  const response = await api.get("/analytics/funnel");
  return response.data;
};

// Get recent activities
export const getRecentActivities = async (limit = 20) => {
  const response = await api.get(`/analytics/activities?limit=${limit}`);
  return response.data;
};

export default {
  getComprehensiveAnalytics,
  getDashboard,
  getPipelineFunnel,
  getRecentActivities,
};
