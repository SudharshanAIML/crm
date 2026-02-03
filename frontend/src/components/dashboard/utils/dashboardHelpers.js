/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 chars)
 */
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Get page title based on active view and stage
 * @param {string} activeView - Current view (contacts, analytics, calendar, gmail, team, sessions, settings)
 * @param {string} activeStage - Current pipeline stage
 * @returns {string} Page title
 */
export const getPageTitle = (activeView, activeStage) => {
  switch (activeView) {
    case 'analytics':
      return 'Analytics Dashboard';
    case 'calendar':
      return 'Calendar';
    case 'gmail':
      return 'Gmail';
    case 'team':
      return 'Team Management';
    case 'settings':
      return 'Settings';
    case 'sessions':
      return `${activeStage ? activeStage.charAt(0) + activeStage.slice(1).toLowerCase() : ''} Sessions`;
    case 'contacts':
    default:
      return activeStage 
        ? `${activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Pipeline`
        : 'Pipeline';
  }
};

/**
 * Pipeline stages
 */
export const PIPELINE_STAGES = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'];

/**
 * Dashboard view types
 */
export const VIEW_TYPES = {
  CONTACTS: 'contacts',
  ANALYTICS: 'analytics',
  CALENDAR: 'calendar',
  GMAIL: 'gmail',
};
