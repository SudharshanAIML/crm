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

// Get admin analytics (company-wide)
export const getAdminAnalytics = async () => {
  const response = await api.get("/analytics/admin");
  return response.data;
};

// Get product analytics
export const getProductAnalytics = async () => {
  const response = await api.get("/analytics/products");
  return response.data;
};

// Get product details
export const getProductDetails = async (productName) => {
  const response = await api.get(`/analytics/products/${encodeURIComponent(productName)}`);
  return response.data;
};

export default {
  getComprehensiveAnalytics,
  getDashboard,
  getPipelineFunnel,
  getRecentActivities,
  getAdminAnalytics,
  getProductAnalytics,
  getProductDetails,
};
