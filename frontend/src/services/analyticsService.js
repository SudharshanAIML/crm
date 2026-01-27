import api from "./api";

/**
 * Analytics Service - Handles all analytics API calls
 */

// Get comprehensive analytics for employee dashboard
export const getComprehensiveAnalytics = async () => {
  const response = await api.get("/analytics/comprehensive");
  return response.data;
};

// Get enhanced analytics (forecast)
export const getEnhancedAnalytics = async () => {
  const response = await api.get(`/analytics/enhanced`);
  return response.data;
};

// Get yearly activity heatmap (LeetCode-style)
export const getYearlyActivityHeatmap = async (year = null) => {
  const url = year 
    ? `/analytics/activity-heatmap?year=${year}` 
    : '/analytics/activity-heatmap';
  const response = await api.get(url);
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

/* ---------------------------------------------------
   INSIGHTS API FUNCTIONS
--------------------------------------------------- */

// Build query string from filters object
const buildInsightsQuery = (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.datePreset) {
    params.append('datePreset', filters.datePreset);
  } else if (filters.startDate || filters.endDate) {
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
  }
  
  if (filters.source) params.append('source', filters.source);
  if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.period) params.append('period', filters.period);
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

// Get comprehensive insights with filters
export const getInsights = async (filters = {}) => {
  const query = buildInsightsQuery(filters);
  const response = await api.get(`/analytics/insights${query}`);
  return response.data;
};

// Get filter options (sources, employees, date presets)
export const getInsightFilters = async () => {
  const response = await api.get('/analytics/insights/filters');
  return response.data;
};

// Get business performance metrics
export const getInsightPerformance = async (filters = {}) => {
  const query = buildInsightsQuery(filters);
  const response = await api.get(`/analytics/insights/performance${query}`);
  return response.data;
};

// Get top customers analysis
export const getInsightCustomers = async (filters = {}) => {
  const query = buildInsightsQuery(filters);
  const response = await api.get(`/analytics/insights/customers${query}`);
  return response.data;
};

// Get deal bottleneck analysis
export const getInsightBottlenecks = async (filters = {}) => {
  const query = buildInsightsQuery(filters);
  const response = await api.get(`/analytics/insights/bottlenecks${query}`);
  return response.data;
};

// Get actionable recommendations
export const getInsightRecommendations = async () => {
  const response = await api.get('/analytics/insights/recommendations');
  return response.data;
};

// Get trends data for charts
export const getInsightTrends = async (filters = {}) => {
  const query = buildInsightsQuery(filters);
  const response = await api.get(`/analytics/insights/trends${query}`);
  return response.data;
};

export default {
  getComprehensiveAnalytics,
  getEnhancedAnalytics,
  getYearlyActivityHeatmap,
  getDashboard,
  getPipelineFunnel,
  getRecentActivities,
  getAdminAnalytics,
  getProductAnalytics,
  getProductDetails,
  // Insights
  getInsights,
  getInsightFilters,
  getInsightPerformance,
  getInsightCustomers,
  getInsightBottlenecks,
  getInsightRecommendations,
  getInsightTrends,
};
