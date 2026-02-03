import { useEffect, memo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAdmin } from '../context/AdminContext';
import { AnalyticsTab } from '../components/admin';

/**
 * AdminAnalyticsPage - Company-wide analytics dashboard for admins
 * Shows overall company performance, not individual employee metrics
 * Uses cached data from AdminContext for optimal performance
 */
const AdminAnalyticsPage = memo(() => {
  const { formatCompact, format: formatCurrency } = useCurrency();
  
  // Get shared data from context (persists across navigation)
  const {
    analytics,
    analyticsLoading,
    analyticsError,
    fetchAnalytics
  } = useAdmin();

  // Fetch analytics on mount (uses cache if available)
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <AnalyticsTab
      analytics={analytics}
      analyticsLoading={analyticsLoading}
      analyticsError={analyticsError}
      onRetry={() => fetchAnalytics(true)}
      formatCompact={formatCompact}
      formatCurrency={formatCurrency}
    />
  );
});

AdminAnalyticsPage.displayName = 'AdminAnalyticsPage';

export default AdminAnalyticsPage;
