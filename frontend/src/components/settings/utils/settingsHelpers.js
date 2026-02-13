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
 * Settings tab configuration
 */
export const SETTINGS_TABS = [
  { 
    id: 'profile', 
    label: 'Profile', 
    icon: 'User', 
    description: 'Your personal information' 
  },
  { 
    id: 'integrations', 
    label: 'Integrations', 
    icon: 'Link2', 
    description: 'Connected services' 
  },
  { 
    id: 'notifications', 
    label: 'Notifications', 
    icon: 'Bell', 
    description: 'Alert preferences' 
  },
  { 
    id: 'security', 
    label: 'Security', 
    icon: 'Shield', 
    description: 'Account protection' 
  },
  { 
    id: 'preferences', 
    label: 'Preferences', 
    icon: 'Sliders', 
    description: 'App settings' 
  },
];

/**
 * Default notification settings
 */
export const DEFAULT_NOTIFICATIONS = [
  { 
    id: 'email', 
    label: 'Email Notifications', 
    desc: 'Receive notifications via email', 
    checked: true 
  },
  { 
    id: 'leads', 
    label: 'Lead Updates', 
    desc: 'Get notified when leads change status', 
    checked: true 
  },
  { 
    id: 'deals', 
    label: 'Deal Alerts', 
    desc: 'Notifications for deal milestones', 
    checked: false 
  },
  { 
    id: 'tasks', 
    label: 'Task Reminders', 
    desc: 'Reminders for upcoming tasks', 
    checked: true 
  },
  { 
    id: 'team', 
    label: 'Team Activity', 
    desc: 'Updates from your team members', 
    checked: false 
  },
];

/**
 * Google integration feature list (Gmail + Calendar)
 */
export const GOOGLE_INTEGRATION_FEATURES = [
  { title: 'Gmail Integration', desc: 'Send & receive emails directly in CRM' },
  { title: 'Calendar Sync', desc: 'Tasks auto-sync to Google Calendar' },
  { title: 'Contact Invites', desc: 'Contacts added as event attendees' },
  { title: 'Your Identity', desc: 'Emails sent from your own address' },
];

/**
 * Preference options
 */
export const PREFERENCE_OPTIONS = {
  pipelineViews: ['Lead', 'MQL', 'SQL', 'Opportunity'],
  contactsPerPage: ['10', '25', '50', '100'],
  dateFormats: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
};
