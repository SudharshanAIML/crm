import { memo } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  KPICards,
  PeriodComparison,
  ConversionFunnel,
  OpportunityOutcomes,
  SourcePerformance,
  TemperatureDistribution,
  SessionStatistics,
  EmployeeLeaderboard,
  MonthlyTrends,
  TopSources,
  AnalyticsLoading,
  AnalyticsError
} from './AnalyticsComponents';

/**
 * AnalyticsTab - Main analytics dashboard component
 * Composes smaller, memoized components for optimal performance
 * Only re-renders when analytics data changes
 */
const AnalyticsTab = memo(({
  analytics,
  analyticsLoading,
  analyticsError,
  onRetry,
  formatCompact,
  formatCurrency
}) => {
  // Loading state
  if (analyticsLoading) {
    return <AnalyticsLoading />;
  }

  // Error state
  if (analyticsError) {
    return <AnalyticsError error={analyticsError} onRetry={onRetry} />;
  }

  // No data state
  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900">Company Analytics</h2>
        <button
          onClick={onRetry}
          disabled={analyticsLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-sky-600 hover:bg-white border border-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
          {analyticsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards */}
      <KPICards overview={analytics.overview} formatCompact={formatCompact} />

      {/* Period Comparison */}
      <PeriodComparison 
        periodComparison={analytics.periodComparison} 
        formatCompact={formatCompact} 
      />

      {/* Funnel & Outcomes Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionFunnel funnel={analytics.funnel} />
        <OpportunityOutcomes 
          outcomes={analytics.opportunityOutcomes} 
          formatCompact={formatCompact} 
        />
      </div>

      {/* Source & Temperature Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SourcePerformance sources={analytics.sourcePerformance} />
        <TemperatureDistribution distribution={analytics.temperatureDistribution} />
      </div>

      {/* Session Statistics */}
      <SessionStatistics stats={analytics.sessionStats} />

      {/* Employee Leaderboard */}
      <EmployeeLeaderboard 
        leaderboard={analytics.employeeLeaderboard}
        formatCompact={formatCompact}
        formatCurrency={formatCurrency}
      />

      {/* Monthly Trends */}
      <MonthlyTrends trends={analytics.trends} formatCompact={formatCompact} />

      {/* Top Sources */}
      <TopSources sources={analytics.topSources} formatCompact={formatCompact} />
    </div>
  );
});

AnalyticsTab.displayName = 'AnalyticsTab';

export default AnalyticsTab;
