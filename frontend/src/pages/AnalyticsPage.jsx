import { memo } from 'react';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

/**
 * Analytics page - displays analytics dashboard
 */
const AnalyticsPage = memo(() => {
  return <AnalyticsDashboard />;
});

AnalyticsPage.displayName = 'AnalyticsPage';

export default AnalyticsPage;
