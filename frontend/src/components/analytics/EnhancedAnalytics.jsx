import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  BarChart3,
  ArrowRight,
  Calendar,
  RefreshCw,
  AlertCircle,
  Zap,
  DollarSign,
  Activity,
  Percent,
  Timer,
  ChevronDown,
  Filter,
  Flame,
  Droplets,
  Snowflake,
} from 'lucide-react';
import { getEnhancedAnalytics } from '../../services/analyticsService';
import { useAuth } from '../../context/AuthContext';

// Cache configuration
const CACHE_KEY = 'enhanced_analytics';
const STALE_TIME = 3 * 60 * 1000; // 3 minutes
const CACHE_TIME = 15 * 60 * 1000; // 15 minutes

const enhancedCache = {
  data: {},
  timestamp: {},
  promise: null,
};

const isCacheFresh = (period) => {
  if (!enhancedCache.timestamp[period]) return false;
  return Date.now() - enhancedCache.timestamp[period] < STALE_TIME;
};

const isCacheValid = (period) => {
  if (!enhancedCache.timestamp[period]) return false;
  return Date.now() - enhancedCache.timestamp[period] < CACHE_TIME;
};

// Stage colors
const STAGE_COLORS = {
  LEAD: { bg: 'bg-slate-500', light: 'bg-slate-100', text: 'text-slate-600', gradient: 'from-slate-400 to-slate-600' },
  MQL: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-400 to-blue-600' },
  SQL: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-400 to-purple-600' },
  OPPORTUNITY: { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600', gradient: 'from-amber-400 to-amber-600' },
  CUSTOMER: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600', gradient: 'from-emerald-400 to-emerald-600' },
  EVANGELIST: { bg: 'bg-sky-500', light: 'bg-sky-100', text: 'text-sky-600', gradient: 'from-sky-400 to-sky-600' },
};

const EnhancedAnalytics = memo(() => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(() => isCacheValid(period) ? enhancedCache.data[period] : null);
  const [loading, setLoading] = useState(() => !isCacheValid(period));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  // Fetch data with caching
  const fetchData = useCallback(async (selectedPeriod, forceRefresh = false) => {
    if (!forceRefresh && isCacheFresh(selectedPeriod) && enhancedCache.data[selectedPeriod]) {
      return enhancedCache.data[selectedPeriod];
    }

    try {
      const result = await getEnhancedAnalytics(selectedPeriod);
      enhancedCache.data[selectedPeriod] = result;
      enhancedCache.timestamp[selectedPeriod] = Date.now();
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  // Load data on mount or period change
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadData = async () => {
      if (isCacheValid(period) && enhancedCache.data[period]) {
        setData(enhancedCache.data[period]);
        setLoading(false);
        
        if (!isCacheFresh(period)) {
          setIsRefreshing(true);
          try {
            const freshData = await fetchData(period, true);
            if (isMountedRef.current) setData(freshData);
          } catch (err) {
            console.warn('Background refresh failed:', err);
          } finally {
            if (isMountedRef.current) setIsRefreshing(false);
          }
        }
      } else {
        setLoading(true);
        setError(null);
        try {
          const result = await fetchData(period, true);
          if (isMountedRef.current) {
            setData(result);
            setLoading(false);
          }
        } catch (err) {
          if (isMountedRef.current) {
            setError('Failed to load analytics');
            setLoading(false);
          }
        }
      }
    };

    loadData();
    return () => { isMountedRef.current = false; };
  }, [period, fetchData]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchData(period, true);
      setData(result);
    } catch (err) {
      setError('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle period change
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (isCacheValid(newPeriod) && enhancedCache.data[newPeriod]) {
      setData(enhancedCache.data[newPeriod]);
    } else {
      setData(null);
    }
  };

  // Get company currency
  const currency = useMemo(() => {
    const region = user?.company?.region;
    if (region === 'IN' || region === 'INDIA') return { symbol: '₹', code: 'INR' };
    if (region === 'EU' || region === 'EUROPE') return { symbol: '€', code: 'EUR' };
    if (region === 'UK' || region === 'GB') return { symbol: '£', code: 'GBP' };
    return { symbol: '$', code: 'USD' };
  }, [user?.company?.region]);

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) return `${currency.symbol}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${currency.symbol}${(value / 1000).toFixed(1)}K`;
    return `${currency.symbol}${value.toFixed(0)}`;
  };

  if (loading && !data) {
    return <EnhancedAnalyticsSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-3">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Enhanced Analytics</h2>
          <p className="text-sm text-gray-500">Deep insights into your sales performance</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {['week', 'month', 'quarter'].map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-white text-sky-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Background refresh indicator */}
      {isRefreshing && data && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-600 text-sm rounded-lg w-fit">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Updating...</span>
        </div>
      )}

      {/* Historical Comparison */}
      <HistoricalComparison data={data.historicalComparison} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Visualization */}
        <FunnelVisualization data={data.funnelVisualization} />

        {/* Win Probability */}
        <WinProbability data={data.winProbability} />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Time Analysis */}
        <StageTimeAnalysis data={data.stageTimeAnalysis} velocityMetrics={data.velocityMetrics} />

        {/* Forecast vs Actual */}
        <ForecastVsActual data={data.forecastVsActual} formatCurrency={formatCurrency} />
      </div>

      {/* Activity Heatmap */}
      <ActivityHeatmap data={data.activityHeatmap} />
    </div>
  );
});

EnhancedAnalytics.displayName = 'EnhancedAnalytics';

// Historical Comparison Component
const HistoricalComparison = memo(({ data }) => {
  const metrics = [
    { key: 'newLeads', label: 'New Leads', icon: Target, color: 'sky' },
    { key: 'conversions', label: 'Conversions', icon: TrendingUp, color: 'emerald' },
    { key: 'sessions', label: 'Sessions', icon: Activity, color: 'purple' },
  ];

  const periodLabels = {
    week: 'vs Last Week',
    month: 'vs Last Month',
    quarter: 'vs Last Quarter',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metrics.map((metric) => {
        const current = data.current[metric.key];
        const previous = data.previous[metric.key];
        const growth = data.growth[metric.key];
        const isPositive = growth >= 0;
        const Icon = metric.icon;

        const colorClasses = {
          sky: { bg: 'bg-sky-50', text: 'text-sky-600', icon: 'bg-sky-100' },
          emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'bg-emerald-100' },
          purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
        };
        const colors = colorClasses[metric.color];

        return (
          <div
            key={metric.key}
            className={`p-5 rounded-xl border-2 ${colors.bg} border-transparent hover:border-gray-200 transition-colors`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${colors.icon}`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{isPositive ? '+' : ''}{growth}%</span>
              </div>
            </div>
            <p className={`text-3xl font-bold ${colors.text}`}>{current}</p>
            <p className="text-sm text-gray-600 mt-1">{metric.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {periodLabels[data.period]} ({previous})
            </p>
          </div>
        );
      })}
    </div>
  );
});

HistoricalComparison.displayName = 'HistoricalComparison';

// Funnel Visualization Component
const FunnelVisualization = memo(({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-sky-500" />
        <h3 className="text-lg font-semibold text-gray-800">Sales Funnel</h3>
      </div>

      <div className="space-y-3">
        {data.filter(d => d.stage !== 'EVANGELIST').map((stage, index) => {
          const colors = STAGE_COLORS[stage.stage] || STAGE_COLORS.LEAD;
          const widthPercent = (stage.count / maxCount) * 100;

          return (
            <div key={stage.stage} className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.light} ${colors.text}`}>
                    {stage.stage}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{stage.count}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {index > 0 && (
                    <span className={`${stage.conversionRate >= 50 ? 'text-emerald-600' : stage.conversionRate >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                      {stage.conversionRate}% from prev
                    </span>
                  )}
                  <span className="text-gray-400">
                    Win: {stage.winProbability}%
                  </span>
                </div>
              </div>

              {/* Funnel Bar */}
              <div className="h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-500 rounded-lg`}
                  style={{ width: `${Math.max(widthPercent, 8)}%` }}
                />
                {/* Temperature breakdown inside bar */}
                <div className="absolute inset-0 flex items-center justify-end pr-3 gap-2">
                  {stage.hotLeads > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-white/90">
                      <Flame className="w-3 h-3" />
                      {stage.hotLeads}
                    </span>
                  )}
                  {stage.warmLeads > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-white/80">
                      <Droplets className="w-3 h-3" />
                      {stage.warmLeads}
                    </span>
                  )}
                  {stage.coldLeads > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-white/70">
                      <Snowflake className="w-3 h-3" />
                      {stage.coldLeads}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow to next stage */}
              {index < data.filter(d => d.stage !== 'EVANGELIST').length - 1 && (
                <div className="flex justify-center my-1">
                  <ChevronDown className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Flame className="w-3 h-3 text-red-400" /> Hot
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Droplets className="w-3 h-3 text-orange-400" /> Warm
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Snowflake className="w-3 h-3 text-blue-400" /> Cold
        </span>
      </div>
    </div>
  );
});

FunnelVisualization.displayName = 'FunnelVisualization';

// Win Probability Component
const WinProbability = memo(({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Percent className="w-5 h-5 text-sky-500" />
        <h3 className="text-lg font-semibold text-gray-800">Win Probability by Stage</h3>
      </div>

      <div className="space-y-4">
        {data.map((stage) => {
          const colors = STAGE_COLORS[stage.stage] || STAGE_COLORS.LEAD;
          const probability = stage.probability || 0;

          return (
            <div key={stage.stage} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
                  <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {stage.converted}/{stage.total} won
                  </span>
                  <span className={`text-sm font-bold ${
                    probability >= 50 ? 'text-emerald-600' : 
                    probability >= 25 ? 'text-amber-600' : 'text-red-500'
                  }`}>
                    {probability}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    probability >= 50 ? 'bg-emerald-500' : 
                    probability >= 25 ? 'bg-amber-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${probability}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-5 p-3 bg-gradient-to-r from-sky-50 to-indigo-50 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-sky-500" />
          <span className="text-sm font-medium text-gray-700">Conversion Insight</span>
        </div>
        <p className="text-xs text-gray-500">
          {data.find(d => d.stage === 'OPPORTUNITY')?.probability >= 50
            ? 'Strong opportunity-to-customer conversion. Focus on pipeline quality.'
            : 'Opportunity conversion needs attention. Review qualification criteria.'}
        </p>
      </div>
    </div>
  );
});

WinProbability.displayName = 'WinProbability';

// Stage Time Analysis Component
const StageTimeAnalysis = memo(({ data, velocityMetrics }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Timer className="w-5 h-5 text-sky-500" />
        <h3 className="text-lg font-semibold text-gray-800">Time in Stage</h3>
      </div>

      {/* Velocity Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 bg-sky-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-sky-600">{velocityMetrics.totalCycle}</p>
          <p className="text-xs text-sky-500">Total Cycle (days)</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-emerald-600">{velocityMetrics.oppToCustomer || '—'}</p>
          <p className="text-xs text-emerald-500">Opp → Close (days)</p>
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="space-y-3">
        {data.map((stage) => {
          const colors = STAGE_COLORS[stage.stage] || STAGE_COLORS.LEAD;
          const isLong = stage.avgDays > 14;

          return (
            <div key={stage.stage} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${colors.bg}`} />
                <div>
                  <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                  <p className="text-xs text-gray-400">{stage.totalContacts} contacts</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${isLong ? 'text-amber-600' : 'text-gray-700'}`}>
                  {stage.avgDays} days avg
                  {isLong && <AlertCircle className="w-3 h-3 inline ml-1" />}
                </div>
                <p className="text-xs text-gray-400">
                  {stage.minDays}–{stage.maxDays} range
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Velocity flow */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">Average transition time:</p>
        <div className="flex items-center justify-between text-xs">
          <div className="text-center">
            <p className="font-medium text-gray-600">{velocityMetrics.leadToMql}d</p>
            <p className="text-gray-400">L→MQL</p>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <div className="text-center">
            <p className="font-medium text-gray-600">{velocityMetrics.mqlToSql}d</p>
            <p className="text-gray-400">MQL→SQL</p>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <div className="text-center">
            <p className="font-medium text-gray-600">{velocityMetrics.sqlToOpp}d</p>
            <p className="text-gray-400">SQL→Opp</p>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <div className="text-center">
            <p className="font-medium text-gray-600">{velocityMetrics.oppToCustomer}d</p>
            <p className="text-gray-400">Opp→Won</p>
          </div>
        </div>
      </div>
    </div>
  );
});

StageTimeAnalysis.displayName = 'StageTimeAnalysis';

// Forecast vs Actual Component
const ForecastVsActual = memo(({ data, formatCurrency }) => {
  const { monthly, pipeline } = data;
  const maxValue = Math.max(
    ...monthly.map(m => Math.max(m.actual, m.forecast)),
    1
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <DollarSign className="w-5 h-5 text-sky-500" />
        <h3 className="text-lg font-semibold text-gray-800">Forecast vs Actual</h3>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="p-3 bg-purple-50 rounded-lg text-center">
          <p className="text-lg font-bold text-purple-600">{formatCurrency(pipeline.total)}</p>
          <p className="text-xs text-purple-500">Pipeline Value</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg text-center">
          <p className="text-lg font-bold text-amber-600">{pipeline.opportunities}</p>
          <p className="text-xs text-amber-500">Open Opps</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg text-center">
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(pipeline.avgDealSize)}</p>
          <p className="text-xs text-emerald-500">Avg Deal</p>
        </div>
      </div>

      {/* Monthly Chart */}
      {monthly.length > 0 ? (
        <div className="space-y-3">
          {monthly.map((month) => {
            const actualWidth = (month.actual / maxValue) * 100;
            const forecastWidth = (month.forecast / maxValue) * 100;
            const variance = month.variance;
            const isPositive = variance >= 0;

            return (
              <div key={month.month} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{month.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(variance)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  {/* Actual */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-14">Actual</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded transition-all"
                        style={{ width: `${Math.max(actualWidth, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-16 text-right">
                      {formatCurrency(month.actual)}
                    </span>
                  </div>
                  {/* Forecast */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-14">Forecast</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded transition-all"
                        style={{ width: `${Math.max(forecastWidth, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-16 text-right">
                      {formatCurrency(month.forecast)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No revenue data yet</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-3 h-3 bg-emerald-500 rounded" /> Actual
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-3 h-3 bg-purple-400 rounded" /> Forecast
        </span>
      </div>
    </div>
  );
});

ForecastVsActual.displayName = 'ForecastVsActual';

// Activity Heatmap Component
const ActivityHeatmap = memo(({ data }) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Build heatmap grid
  const heatmapData = useMemo(() => {
    const grid = {};
    data.forEach(item => {
      const key = `${item.day}-${item.hour}`;
      grid[key] = item.count;
    });
    return grid;
  }, [data]);

  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Get intensity class
  const getIntensity = (count) => {
    if (!count) return 'bg-gray-100';
    const ratio = count / maxCount;
    if (ratio >= 0.75) return 'bg-sky-500';
    if (ratio >= 0.5) return 'bg-sky-400';
    if (ratio >= 0.25) return 'bg-sky-300';
    return 'bg-sky-200';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Calendar className="w-5 h-5 text-sky-500" />
        <h3 className="text-lg font-semibold text-gray-800">Activity Heatmap</h3>
        <span className="text-xs text-gray-400">(Last 3 months)</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex items-center gap-0.5 mb-1 ml-12">
            {[0, 6, 12, 18, 23].map(h => (
              <div key={h} className="text-xs text-gray-400" style={{ width: `${(h === 23 ? 1 : 6) * 16}px` }}>
                {h}:00
              </div>
            ))}
          </div>

          {/* Grid */}
          {days.map((day, dayIndex) => (
            <div key={day} className="flex items-center gap-0.5 mb-0.5">
              <span className="text-xs text-gray-500 w-10">{day}</span>
              {hours.map(hour => {
                const key = `${dayIndex + 1}-${hour}`;
                const count = heatmapData[key] || 0;
                return (
                  <div
                    key={hour}
                    className={`w-4 h-4 rounded-sm ${getIntensity(count)} transition-colors hover:ring-2 hover:ring-sky-300 cursor-default`}
                    title={`${day} ${hour}:00 - ${count} sessions`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-xs text-gray-400">Less</span>
        <div className="w-4 h-4 rounded-sm bg-gray-100" />
        <div className="w-4 h-4 rounded-sm bg-sky-200" />
        <div className="w-4 h-4 rounded-sm bg-sky-300" />
        <div className="w-4 h-4 rounded-sm bg-sky-400" />
        <div className="w-4 h-4 rounded-sm bg-sky-500" />
        <span className="text-xs text-gray-400">More</span>
      </div>
    </div>
  );
});

ActivityHeatmap.displayName = 'ActivityHeatmap';

// Skeleton Loader
function EnhancedAnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-40 bg-gray-100 rounded-lg" />
          <div className="h-10 w-10 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Historical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-5 rounded-xl bg-gray-50">
            <div className="flex justify-between mb-3">
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              <div className="h-5 w-16 bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-6 w-40 bg-gray-200 rounded mb-5" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EnhancedAnalytics;
