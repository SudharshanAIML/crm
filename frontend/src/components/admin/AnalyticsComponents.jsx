import { memo } from 'react';
import {
  Users, DollarSign, Target, Percent, Zap, Timer,
  TrendingUp, TrendingDown, PieChart, Clock, CheckCircle2,
  XCircle, Thermometer, Flame, Snowflake, PhoneCall, Star,
  Trophy, Crown, Award, RefreshCw, AlertCircle
} from 'lucide-react';

// ============================================
// KPI CARDS
// ============================================

/**
 * KPICards - Row of key performance indicator cards
 */
export const KPICards = memo(({ overview, formatCompact }) => {
  const cards = [
    { 
      label: 'Total Contacts', 
      value: overview.totalContacts.toLocaleString(), 
      icon: Users, 
      gradient: 'from-blue-50 to-blue-100', 
      border: 'border-blue-200',
      iconBg: 'bg-blue-500',
      textColor: 'text-blue-900'
    },
    { 
      label: 'Revenue', 
      value: formatCompact(overview.totalRevenue || 0), 
      icon: DollarSign, 
      gradient: 'from-green-50 to-green-100', 
      border: 'border-green-200',
      iconBg: 'bg-green-500',
      textColor: 'text-green-900'
    },
    { 
      label: 'Deals Closed', 
      value: overview.totalDeals, 
      icon: Target, 
      gradient: 'from-purple-50 to-purple-100', 
      border: 'border-purple-200',
      iconBg: 'bg-purple-500',
      textColor: 'text-purple-900'
    },
    { 
      label: 'Conversion Rate', 
      value: `${overview.overallConversionRate}%`, 
      icon: Percent, 
      gradient: 'from-amber-50 to-amber-100', 
      border: 'border-amber-200',
      iconBg: 'bg-amber-500',
      textColor: 'text-amber-900'
    },
    { 
      label: 'Pipeline Value', 
      value: formatCompact(overview.pipelineValue || 0), 
      icon: Zap, 
      gradient: 'from-cyan-50 to-cyan-100', 
      border: 'border-cyan-200',
      iconBg: 'bg-cyan-500',
      textColor: 'text-cyan-900'
    },
    { 
      label: 'Avg Sales Cycle', 
      value: `${overview.avgSalesCycle}d`, 
      icon: Timer, 
      gradient: 'from-rose-50 to-rose-100', 
      border: 'border-rose-200',
      iconBg: 'bg-rose-500',
      textColor: 'text-rose-900'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <KPICard key={card.label} {...card} />
      ))}
    </div>
  );
});

const KPICard = memo(({ label, value, icon: Icon, gradient, border, iconBg, textColor }) => (
  <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 border ${border}`}>
    <div className="flex items-center gap-2 mb-2">
      <div className={`p-1.5 ${iconBg} rounded-lg`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className={`text-xs font-medium ${textColor.replace('900', '600')}`}>{label}</span>
    </div>
    <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
  </div>
));

// ============================================
// PERIOD COMPARISON
// ============================================

/**
 * PeriodComparison - Comparison cards for different time periods
 */
export const PeriodComparison = memo(({ periodComparison, formatCompact }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <ComparisonCard
      label="Leads (Last 30 days)"
      current={periodComparison.leads.current}
      previous={periodComparison.leads.previous}
      growth={periodComparison.leads.growth}
    />
    <ComparisonCard
      label="Deals (Last 30 days)"
      current={periodComparison.deals.current}
      previous={periodComparison.deals.previous}
      growth={periodComparison.deals.growth}
    />
    <ComparisonCard
      label="Revenue (Last 30 days)"
      current={formatCompact(periodComparison.revenue.current || 0)}
      previous={formatCompact(periodComparison.revenue.previous || 0)}
      growth={periodComparison.revenue.growth}
      formatValue={formatCompact}
    />
  </div>
));

const ComparisonCard = memo(({ label, current, previous, growth }) => {
  const isPositive = growth >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          {Math.abs(growth)}%
        </span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{current}</p>
      <p className="text-xs text-gray-400 mt-1">vs {previous} previous period</p>
    </div>
  );
});

// ============================================
// CONVERSION FUNNEL
// ============================================

/**
 * ConversionFunnel - Visual funnel showing conversion stages
 */
export const ConversionFunnel = memo(({ funnel }) => {
  const colors = {
    'LEAD': 'bg-gray-400',
    'MQL': 'bg-blue-400',
    'SQL': 'bg-indigo-500',
    'OPPORTUNITY': 'bg-purple-500',
    'CUSTOMER': 'bg-green-500',
    'EVANGELIST': 'bg-amber-500'
  };

  const maxCount = funnel[0]?.count || 1;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-sky-500" />
        Conversion Funnel
      </h3>
      <div className="space-y-3">
        {funnel.map((stage, index) => {
          const percentage = (stage.count / maxCount) * 100;
          return (
            <div key={stage.stage}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{stage.stage}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{stage.count}</span>
                  {stage.conversionRate !== undefined && index > 0 && (
                    <span className="text-xs text-gray-400">({stage.conversionRate}% from prev)</span>
                  )}
                </div>
              </div>
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors[stage.stage]} transition-all duration-500 rounded-full`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================
// OPPORTUNITY OUTCOMES
// ============================================

/**
 * OpportunityOutcomes - Shows open, won, and lost opportunities
 */
export const OpportunityOutcomes = memo(({ outcomes, formatCompact }) => {
  const totalClosed = outcomes.won.count + outcomes.lost.count;
  const winRate = totalClosed > 0 
    ? ((outcomes.won.count / totalClosed) * 100).toFixed(1) 
    : 0;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Target className="w-4 h-4 text-sky-500" />
        Opportunity Outcomes
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <OutcomeCard
          icon={Clock}
          count={outcomes.open.count}
          label="Open"
          value={outcomes.open.value}
          color="blue"
          formatCompact={formatCompact}
        />
        <OutcomeCard
          icon={CheckCircle2}
          count={outcomes.won.count}
          label="Won"
          value={outcomes.won.value}
          color="green"
          formatCompact={formatCompact}
        />
        <OutcomeCard
          icon={XCircle}
          count={outcomes.lost.count}
          label="Lost"
          value={outcomes.lost.value}
          color="red"
          formatCompact={formatCompact}
        />
      </div>
      {totalClosed > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Win Rate</span>
            <span className="text-lg font-bold text-green-600">{winRate}%</span>
          </div>
        </div>
      )}
    </div>
  );
});

const OutcomeCard = memo(({ icon: Icon, count, label, value, color, formatCompact }) => {
  const colors = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-500', text: 'text-blue-900', label: 'text-blue-600', value: 'text-blue-400' },
    green: { bg: 'bg-green-50', icon: 'bg-green-500', text: 'text-green-900', label: 'text-green-600', value: 'text-green-400' },
    red: { bg: 'bg-red-50', icon: 'bg-red-500', text: 'text-red-900', label: 'text-red-600', value: 'text-red-400' }
  };
  const c = colors[color];

  return (
    <div className={`text-center p-4 ${c.bg} rounded-xl`}>
      <div className={`w-10 h-10 ${c.icon} rounded-full flex items-center justify-center mx-auto mb-2`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{count}</p>
      <p className={`text-xs ${c.label} font-medium`}>{label}</p>
      <p className={`text-xs ${c.value} mt-1`}>{formatCompact(value)} value</p>
    </div>
  );
});

// ============================================
// SOURCE PERFORMANCE
// ============================================

/**
 * SourcePerformance - Lead source performance metrics
 */
export const SourcePerformance = memo(({ sources }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Zap className="w-4 h-4 text-sky-500" />
      Lead Source Performance
    </h3>
    <div className="space-y-3">
      {sources.slice(0, 6).map((source) => (
        <div key={source.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">{source.source}</p>
            <p className="text-xs text-gray-500">{source.totalLeads} leads • {source.converted} converted</p>
          </div>
          <div className="text-right">
            <span className={`text-sm font-semibold ${
              source.conversionRate >= 20 ? 'text-green-600' :
              source.conversionRate >= 10 ? 'text-amber-600' : 'text-gray-600'
            }`}>
              {source.conversionRate}%
            </span>
            <p className="text-xs text-gray-400">conv. rate</p>
          </div>
        </div>
      ))}
      {sources.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No source data available</p>
      )}
    </div>
  </div>
));

// ============================================
// TEMPERATURE DISTRIBUTION
// ============================================

/**
 * TemperatureDistribution - Lead temperature breakdown
 */
export const TemperatureDistribution = memo(({ distribution }) => {
  const icons = {
    'HOT': Flame,
    'WARM': Thermometer,
    'COLD': Snowflake
  };
  const colors = {
    'HOT': { bg: 'bg-red-100 border-red-200 text-red-800', bar: 'bg-red-500', icon: 'text-red-500' },
    'WARM': { bg: 'bg-amber-100 border-amber-200 text-amber-800', bar: 'bg-amber-500', icon: 'text-amber-500' },
    'COLD': { bg: 'bg-blue-100 border-blue-200 text-blue-800', bar: 'bg-blue-500', icon: 'text-blue-500' }
  };

  const total = distribution.reduce((acc, t) => acc + t.count, 0);

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Thermometer className="w-4 h-4 text-sky-500" />
        Lead Temperature Distribution
      </h3>
      <div className="space-y-4">
        {distribution.map((temp) => {
          const Icon = icons[temp.temperature];
          const c = colors[temp.temperature];
          const percentage = total > 0 ? (temp.count / total) * 100 : 0;

          return (
            <div key={temp.temperature} className={`p-4 rounded-xl border ${c.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${c.icon}`} />
                  <span className="font-semibold">{temp.temperature}</span>
                </div>
                <span className="text-lg font-bold">{temp.count}</span>
              </div>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-2">
                <div className={`h-full ${c.bar} transition-all`} style={{ width: `${percentage}%` }} />
              </div>
              <div className="flex justify-between text-xs opacity-75">
                <span>{percentage.toFixed(1)}% of total</span>
                <span>{temp.conversionRate}% conv. rate</span>
              </div>
            </div>
          );
        })}
        {distribution.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No temperature data available</p>
        )}
      </div>
    </div>
  );
});

// ============================================
// SESSION STATISTICS
// ============================================

/**
 * SessionStatistics - Call/session metrics overview
 */
export const SessionStatistics = memo(({ stats }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <PhoneCall className="w-4 h-4 text-sky-500" />
      Session Statistics
    </h3>
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      <SessionStat value={stats.total} label="Total Sessions" />
      <SessionStat value={stats.connected} label="Connected" className="bg-green-50 text-green-600" />
      <SessionStat value={stats.notConnected} label="Not Connected" className="bg-red-50 text-red-600" />
      <SessionStat value={stats.badTiming} label="Bad Timing" className="bg-amber-50 text-amber-600" />
      <SessionStat value={`${stats.connectionRate}%`} label="Connection Rate" className="bg-sky-50 text-sky-600" />
      <SessionStat 
        value={stats.avgRating} 
        label="Avg Rating" 
        className="bg-purple-50 text-purple-600"
        showStar 
      />
    </div>
  </div>
));

const SessionStat = memo(({ value, label, className = 'bg-gray-50 text-gray-900', showStar = false }) => (
  <div className={`text-center p-3 rounded-lg ${className}`}>
    <div className="flex items-center justify-center gap-1">
      {showStar && <Star className="w-4 h-4 text-purple-500 fill-purple-500" />}
      <p className="text-2xl font-bold">{value}</p>
    </div>
    <p className="text-xs">{label}</p>
  </div>
));

// ============================================
// EMPLOYEE LEADERBOARD
// ============================================

/**
 * EmployeeLeaderboard - Top performers table
 */
export const EmployeeLeaderboard = memo(({ leaderboard, formatCompact, formatCurrency }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        Employee Leaderboard
      </h3>
      {leaderboard.length > 7 && (
        <span className="text-xs text-gray-400">{leaderboard.length} employees</span>
      )}
    </div>
    <div className="overflow-x-auto">
      <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
        <table className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-100">
              {['Rank', 'Employee', 'Contacts', 'Conversions', 'Conv. Rate', 'Deals', 'Revenue', 'Sessions', 'Avg Rating'].map((header, i) => (
                <th 
                  key={header} 
                  className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white ${
                    i === 6 ? 'text-right' : i >= 2 && i <= 5 || i >= 7 ? 'text-center' : 'text-left'
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leaderboard.map((emp, index) => (
              <LeaderboardRow
                key={emp.emp_id}
                employee={emp}
                rank={index}
                formatCompact={formatCompact}
                formatCurrency={formatCurrency}
              />
            ))}
          </tbody>
        </table>
      </div>
      {leaderboard.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No employee data available</p>
      )}
    </div>
  </div>
));

const LeaderboardRow = memo(({ employee, rank, formatCompact, formatCurrency }) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="py-3 px-4">
      <RankBadge rank={rank} />
    </td>
    <td className="py-3 px-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{employee.name}</p>
        <p className="text-xs text-gray-500">{employee.department || 'No dept'}</p>
      </div>
    </td>
    <td className="py-3 px-4 text-center">
      <span className="text-sm font-semibold text-gray-700">{employee.contactsHandled}</span>
    </td>
    <td className="py-3 px-4 text-center">
      <span className="text-sm font-semibold text-green-600">{employee.conversions}</span>
    </td>
    <td className="py-3 px-4 text-center">
      <span className={`text-sm font-semibold ${
        employee.conversionRate >= 20 ? 'text-green-600' :
        employee.conversionRate >= 10 ? 'text-amber-600' : 'text-gray-600'
      }`}>
        {employee.conversionRate}%
      </span>
    </td>
    <td className="py-3 px-4 text-center">
      <span className="text-sm font-semibold text-purple-600">{employee.dealsClosed}</span>
    </td>
    <td className="py-3 px-4 text-right">
      <span
        className="text-sm font-bold text-gray-900 cursor-help"
        title={formatCurrency(employee.totalRevenue || 0, { compact: false })}
      >
        {formatCompact(employee.totalRevenue || 0)}
      </span>
    </td>
    <td className="py-3 px-4 text-center">
      <span className="text-sm text-gray-600">{employee.totalSessions}</span>
    </td>
    <td className="py-3 px-4 text-center">
      <div className="flex items-center justify-center gap-1">
        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
        <span className="text-sm font-medium text-gray-700">{employee.avgSessionRating}</span>
      </div>
    </td>
  </tr>
));

const RankBadge = memo(({ rank }) => {
  if (rank === 0) {
    return (
      <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center">
        <Crown className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (rank === 1) {
    return (
      <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center">
        <span className="text-xs font-bold text-white">2</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-7 h-7 bg-amber-600 rounded-full flex items-center justify-center">
        <span className="text-xs font-bold text-white">3</span>
      </div>
    );
  }
  return <span className="text-sm text-gray-500 font-medium ml-2">{rank + 1}</span>;
});

// ============================================
// MONTHLY TRENDS
// ============================================

/**
 * MonthlyTrends - Revenue, leads, and conversions trend charts
 */
export const MonthlyTrends = memo(({ trends, formatCompact }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <TrendingUp className="w-4 h-4 text-sky-500" />
      Monthly Trends (Last 12 Months)
    </h3>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <TrendChart
        title="Revenue"
        data={trends.revenue.slice(-6)}
        valueKey="revenue"
        color="bg-green-500"
        formatValue={formatCompact}
      />
      <TrendChart
        title="New Leads"
        data={trends.leads.slice(-6)}
        valueKey="leads"
        color="bg-blue-500"
      />
      <TrendChart
        title="Conversions"
        data={trends.conversions.slice(-6)}
        valueKey="conversions"
        color="bg-purple-500"
      />
    </div>
  </div>
));

const TrendChart = memo(({ title, data, valueKey, color, formatValue = (v) => v }) => {
  const maxValue = Math.max(...data.map(m => m[valueKey])) || 1;

  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">{title}</h4>
      <div className="space-y-2">
        {data.map((month) => {
          const percentage = (month[valueKey] / maxValue) * 100;
          return (
            <div key={month.month} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16">{month.monthLabel}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-700 w-14 text-right">
                {formatValue(month[valueKey])}
              </span>
            </div>
          );
        })}
        {data.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No data</p>
        )}
      </div>
    </div>
  );
});

// ============================================
// TOP SOURCES
// ============================================

/**
 * TopSources - Top performing sources by revenue
 */
export const TopSources = memo(({ sources, formatCompact }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Award className="w-4 h-4 text-sky-500" />
      Top Performing Sources (by Revenue)
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {sources.map((source, index) => (
        <div
          key={source.source}
          className={`p-4 rounded-xl border ${
            index === 0 ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200' :
            index === 1 ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200' :
            'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {index === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
            <span className="text-sm font-semibold text-gray-900">{source.source}</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCompact(source.revenue)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {source.leads} leads • {source.conversions} conv.
          </p>
        </div>
      ))}
      {sources.length === 0 && (
        <p className="text-sm text-gray-400 col-span-5 text-center py-4">No source data available</p>
      )}
    </div>
  </div>
));

// ============================================
// LOADING & ERROR STATES
// ============================================

export const AnalyticsLoading = memo(() => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
    <div className="flex flex-col items-center justify-center">
      <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mb-4" />
      <p className="text-gray-500">Loading analytics...</p>
    </div>
  </div>
));

export const AnalyticsError = memo(({ error, onRetry }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
    <div className="flex flex-col items-center justify-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <p className="text-gray-600 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
      >
        Retry
      </button>
    </div>
  </div>
));

// Display names
KPICards.displayName = 'KPICards';
KPICard.displayName = 'KPICard';
PeriodComparison.displayName = 'PeriodComparison';
ComparisonCard.displayName = 'ComparisonCard';
ConversionFunnel.displayName = 'ConversionFunnel';
OpportunityOutcomes.displayName = 'OpportunityOutcomes';
OutcomeCard.displayName = 'OutcomeCard';
SourcePerformance.displayName = 'SourcePerformance';
TemperatureDistribution.displayName = 'TemperatureDistribution';
SessionStatistics.displayName = 'SessionStatistics';
SessionStat.displayName = 'SessionStat';
EmployeeLeaderboard.displayName = 'EmployeeLeaderboard';
LeaderboardRow.displayName = 'LeaderboardRow';
RankBadge.displayName = 'RankBadge';
MonthlyTrends.displayName = 'MonthlyTrends';
TrendChart.displayName = 'TrendChart';
TopSources.displayName = 'TopSources';
AnalyticsLoading.displayName = 'AnalyticsLoading';
AnalyticsError.displayName = 'AnalyticsError';
