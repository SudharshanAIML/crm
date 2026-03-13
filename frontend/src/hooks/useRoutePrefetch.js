import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Route Prefetching Strategy
 * Preloads likely next routes to provide seamless navigation
 * Uses intelligent prefetching based on user's current location
 */

// Map of routes to their likely next destinations
const PREFETCH_MAP = {
  '/login': [
    () => import('../pages/ContactsPage'),
    () => import('../pages/OnboardingPage'),
  ],
  '/onboarding': [
    () => import('../pages/ContactsPage'),
    () => import('../components/layout/DashboardLayout'),
  ],
  '/contacts': [
    () => import('../pages/FollowupsPage'),
    () => import('../pages/StageFollowupsPage'),
    () => import('../pages/CalendarPage'),
  ],
  '/sessions': [
    () => import('../pages/ContactsPage'),
    () => import('../pages/CalendarPage'),
  ],
  '/analytics': [
    () => import('../pages/ContactsPage'),
    () => import('../pages/CalendarPage'),
  ],
  '/calendar': [
    () => import('../pages/ContactsPage'),
    () => import('../pages/StageFollowupsPage'),
  ],
  '/gmail': [
    () => import('../pages/ContactsPage'),
    () => import('../pages/FollowupsPage'),
  ],
  '/chat': [
    () => import('../pages/ContactsPage'),
    () => import('../pages/AnalyticsPage'),
  ],
  '/templates': [
    () => import('../pages/PageBuilderPage'),
    () => import('../pages/PageResponsesPage'),
  ],
  '/settings': [
    () => import('../pages/ContactsPage'),
  ],
  '/admin/team': [
    () => import('../pages/ContactsPage'),
    () => import('../pages/AdminAnalyticsPage'),
  ],
  '/admin/analytics': [
    () => import('../pages/ContactsPage'),
    () => import('../pages/AdminTeamPage'),
  ],
};

/**
 * Prefetches routes based on current location
 * Uses requestIdleCallback for non-blocking prefetch
 */
export const useRoutePrefetch = () => {
  const location = useLocation();

  useEffect(() => {
    // Find matching prefetch strategy
    const pathKey = Object.keys(PREFETCH_MAP).find(key => 
      location.pathname.startsWith(key)
    );

    if (!pathKey) return;

    const routesToPrefetch = PREFETCH_MAP[pathKey];

    // Use requestIdleCallback for non-blocking prefetch
    const prefetch = () => {
      routesToPrefetch.forEach((importFn, index) => {
        // Stagger prefetches to avoid network congestion
        setTimeout(() => {
          // Prefetch during browser idle time
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              importFn().catch(() => {
                // Silently fail - module will be loaded when needed
              });
            }, { timeout: 2000 });
          } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
              importFn().catch(() => {});
            }, 100);
          }
        }, index * 300); // Stagger by 300ms
      });
    };

    // Delay initial prefetch to prioritize current page
    const timeoutId = setTimeout(prefetch, 1000);

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);
};

/**
 * Manual prefetch for specific routes
 * Use this for hover/focus interactions
 */
export const prefetchRoute = (routeName) => {
  const importMap = {
    'contacts': () => import('../pages/ContactsPage'),
    'analytics': () => import('../pages/AnalyticsPage'),
    'calendar': () => import('../pages/CalendarPage'),
    'gmail': () => import('../pages/GmailPage'),
    'assistant': () => import('../pages/AIAssistantPage'),
    'followups': () => import('../pages/FollowupsPage'),
    'sessions': () => import('../pages/StageFollowupsPage'),
    'settings': () => import('../pages/SettingsPage'),
    'templates': () => import('../pages/TemplatesPage'),
    'page-builder': () => import('../pages/PageBuilderPage'),
    'admin-team': () => import('../pages/AdminTeamPage'),
    'admin-analytics': () => import('../pages/AdminAnalyticsPage'),
  };

  const importFn = importMap[routeName];
  if (importFn) {
    importFn().catch(() => {
      // Silently fail - will load when navigating
    });
  }
};
