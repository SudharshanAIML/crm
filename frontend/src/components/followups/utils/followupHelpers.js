import { Phone, Mail, Users, Video, Star } from 'lucide-react';

/**
 * Format rating to one decimal place
 * @param {number|string} rating - Rating value
 * @returns {string} Formatted rating
 */
export const formatRating = (rating) => {
  const num = Number(rating);
  if (isNaN(num)) return '0.0';
  return num.toFixed(1);
};

/**
 * Format date to MM/DD/YYYY
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format time to HH:MM AM/PM
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time
 */
export const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 chars)
 */
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
};

/**
 * Get relative time from date (e.g., "5m ago", "2h ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

/**
 * Get future time from date (e.g., "in 5m", "in 2h")
 * @param {string} dateString - ISO date string
 * @returns {string} Future time string
 */
export const getFutureTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `in ${diffMins}m`;
  if (diffHours < 24) return `in ${diffHours}h`;
  if (diffDays < 7) return `in ${diffDays}d`;
  return formatDate(dateString);
};

/**
 * Get status badge color classes
 * @param {string} status - Session status (CONNECTED, NOT_CONNECTED, BAD_TIMING)
 * @returns {string} Tailwind CSS classes
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'CONNECTED':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'NOT_CONNECTED':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'BAD_TIMING':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

/**
 * Get status badge dot color
 * @param {string} status - Session status
 * @returns {string} Tailwind CSS background class
 */
export const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'CONNECTED':
      return 'bg-green-500';
    case 'NOT_CONNECTED':
      return 'bg-red-500';
    case 'BAD_TIMING':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

/**
 * Get contact status badge color
 * @param {string} status - Contact status (LEAD, MQL, SQL, etc.)
 * @returns {string} Tailwind CSS classes
 */
export const getContactStatusColor = (status) => {
  switch (status) {
    case 'LEAD':
      return 'bg-blue-100 text-blue-700';
    case 'MQL':
      return 'bg-purple-100 text-purple-700';
    case 'SQL':
      return 'bg-orange-100 text-orange-700';
    case 'OPPORTUNITY':
      return 'bg-green-100 text-green-700';
    case 'CUSTOMER':
      return 'bg-emerald-100 text-emerald-700';
    case 'EVANGELIST':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

/**
 * Get temperature gradient classes
 * @param {string} temperature - HOT, WARM, or COLD
 * @returns {string} Tailwind gradient classes
 */
export const getTemperatureGradient = (temperature) => {
  switch (temperature) {
    case 'HOT':
      return 'bg-gradient-to-r from-red-500 to-orange-500';
    case 'WARM':
      return 'bg-gradient-to-r from-orange-400 to-yellow-500';
    default:
      return 'bg-gradient-to-r from-blue-400 to-cyan-500';
  }
};

/**
 * Get temperature color classes
 * @param {string} temperature - HOT, WARM, or COLD
 * @returns {object} Object with bg, border, and text color classes
 */
export const getTemperatureColors = (temperature) => {
  switch (temperature) {
    case 'HOT':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-600',
        textBold: 'text-red-700',
      };
    case 'WARM':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-600',
        textBold: 'text-orange-700',
      };
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        textBold: 'text-blue-700',
      };
  }
};

/**
 * Get the next stage in the sales pipeline
 * @param {string} currentStatus - Current contact status
 * @returns {string|null} Next stage or null if at final stage
 */
export const getNextStage = (currentStatus) => {
  const stages = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'];
  const currentIndex = stages.indexOf(currentStatus);
  if (currentIndex < stages.length - 1 && currentIndex >= 0) {
    return stages[currentIndex + 1];
  }
  return null;
};

/**
 * Calculate session statistics
 * @param {Array} sessions - Array of session objects
 * @returns {object} Statistics object
 */
export const calculateSessionStats = (sessions) => {
  const connected = sessions.filter(s => s.session_status === 'CONNECTED').length;
  const notConnected = sessions.filter(s => s.session_status === 'NOT_CONNECTED').length;
  const badTiming = sessions.filter(s => s.session_status === 'BAD_TIMING').length;
  const total = sessions.length;
  const connectionRate = total > 0 ? Math.round((connected / total) * 100) : 0;
  
  // Calculate engagement trend (last 5 sessions vs previous 5)
  const recentSessions = sessions.slice(0, 5);
  const olderSessions = sessions.slice(5, 10);
  const recentAvg = recentSessions.length > 0 
    ? recentSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / recentSessions.length 
    : 0;
  const olderAvg = olderSessions.length > 0 
    ? olderSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / olderSessions.length 
    : recentAvg;
  const trend = recentAvg >= olderAvg ? 'up' : 'down';

  return { connected, notConnected, badTiming, total, connectionRate, trend, recentAvg };
};

/**
 * Filter sessions based on search query
 * @param {Array} sessions - Array of session objects
 * @param {string} searchQuery - Search query string
 * @param {string} contactStatus - Current contact status (fallback for stage)
 * @returns {Array} Filtered sessions
 */
export const filterSessions = (sessions, searchQuery, contactStatus = '') => {
  if (!searchQuery.trim()) return sessions;
  const query = searchQuery.toLowerCase();
  
  return sessions.filter(session => (
    session.mode_of_contact?.toLowerCase().includes(query) ||
    session.session_status?.toLowerCase().includes(query) ||
    session.feedback?.toLowerCase().includes(query) ||
    session.remarks?.toLowerCase().includes(query) ||
    formatDate(session.created_at).toLowerCase().includes(query) ||
    (session.stage || contactStatus).toLowerCase().includes(query)
  ));
};
