import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Clock,
  AlertCircle,
  Phone,
  CheckCircle,
  XCircle,
  Zap,
  Thermometer,
  BarChart3,
  Activity,
  ArrowRight,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { getComprehensiveAnalytics } from "../../services/analyticsService";

// =============================================================================
// CACHE CONFIGURATION - Inspired by SWR/React Query patterns used in Salesforce/HubSpot
// =============================================================================
const CACHE_KEY = 'employee_analytics';
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data is considered fresh
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes - data is kept in cache

// Module-level cache (persists across component remounts)
const analyticsCache = {
  data: null,
  timestamp: null,
  promise: null, // For deduplication of concurrent requests
};

// Helper to check if cached data is still fresh
const isCacheFresh = () => {
  if (!analyticsCache.timestamp) return false;
  return Date.now() - analyticsCache.timestamp < STALE_TIME;
};

// Helper to check if cached data is still valid (not expired)
const isCacheValid = () => {
  if (!analyticsCache.timestamp) return false;
  return Date.now() - analyticsCache.timestamp < CACHE_TIME;
};

// Status color mapping
const STATUS_COLORS = {
  LEAD: { bg: "bg-slate-100", text: "text-slate-600", accent: "bg-slate-500" },
  MQL: { bg: "bg-blue-100", text: "text-blue-600", accent: "bg-blue-500" },
  SQL: { bg: "bg-purple-100", text: "text-purple-600", accent: "bg-purple-500" },
  OPPORTUNITY: { bg: "bg-yellow-100", text: "text-yellow-600", accent: "bg-yellow-500" },
  CUSTOMER: { bg: "bg-emerald-100", text: "text-emerald-600", accent: "bg-emerald-500" },
};

const TEMPERATURE_COLORS = {
  HOT: { bg: "bg-red-100", text: "text-red-600", icon: "🔥" },
  WARM: { bg: "bg-orange-100", text: "text-orange-600", icon: "☀️" },
  COLD: { bg: "bg-blue-100", text: "text-blue-600", icon: "❄️" },
};

export default function AnalyticsDashboard() {
  // Use cached data as initial state (instant render if available)
  const [analytics, setAnalytics] = useState(() => 
    isCacheValid() ? analyticsCache.data : null
  );
  const [loading, setLoading] = useState(() => !isCacheValid());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(() => 
    analyticsCache.timestamp ? new Date(analyticsCache.timestamp) : null
  );
  
  // Track if component is mounted to prevent state updates on unmount
  const isMountedRef = useRef(true);

  // Deduplicated fetch function with caching
  const fetchAnalytics = useCallback(async (forceRefresh = false) => {
    // If data is fresh and not forcing refresh, skip fetch
    if (!forceRefresh && isCacheFresh() && analyticsCache.data) {
      return analyticsCache.data;
    }

    // Deduplicate concurrent requests
    if (analyticsCache.promise) {
      return analyticsCache.promise;
    }

    // Start the fetch
    analyticsCache.promise = (async () => {
      try {
        const data = await getComprehensiveAnalytics();
        
        // Update cache
        analyticsCache.data = data;
        analyticsCache.timestamp = Date.now();
        
        return data;
      } finally {
        analyticsCache.promise = null;
      }
    })();

    return analyticsCache.promise;
  }, []);

  // Initial load with stale-while-revalidate pattern
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadAnalytics = async () => {
      // If we have valid cached data, show it immediately
      if (isCacheValid() && analyticsCache.data) {
        setAnalytics(analyticsCache.data);
        setLastUpdated(new Date(analyticsCache.timestamp));
        setLoading(false);
        
        // If data is stale but valid, revalidate in background
        if (!isCacheFresh()) {
          setIsRefreshing(true);
          try {
            const freshData = await fetchAnalytics(true);
            if (isMountedRef.current) {
              setAnalytics(freshData);
              setLastUpdated(new Date());
            }
          } catch (err) {
            // Silent fail for background refresh - we still have cached data
            console.warn("Background refresh failed:", err);
          } finally {
            if (isMountedRef.current) {
              setIsRefreshing(false);
            }
          }
        }
      } else {
        // No valid cache, do full load
        setLoading(true);
        setError(null);
        try {
          const data = await fetchAnalytics(true);
          if (isMountedRef.current) {
            setAnalytics(data);
            setLastUpdated(new Date());
          }
        } catch (err) {
          console.error("Failed to fetch analytics:", err);
          if (isMountedRef.current) {
            setError("Failed to load analytics. Please try again.");
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }
    };

    loadAnalytics();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAnalytics]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await fetchAnalytics(true);
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to refresh analytics:", err);
      setError("Failed to refresh. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Memoized computed values to prevent re-calculations on re-renders
  const processedData = useMemo(() => {
    if (!analytics) return null;
    
    const { overview, funnel, stagePerformance, followUpEffectiveness, temperatureInsights, sourcePerformance, trends } = analytics;
    
    // Pre-compute expensive calculations
    const funnelMaxCount = Math.max(...(funnel?.map((s) => s.count) || [1]), 1);
    const hasBottleneck = funnel?.some((s, i) => i > 0 && parseFloat(s.dropOff) > 60);
    const bottleneckStage = hasBottleneck ? funnel.find((s, i) => i > 0 && parseFloat(s.dropOff) > 60)?.stage : null;
    
    const temperatureTotal = temperatureInsights?.reduce((sum, t) => sum + t.count, 0) || 1;
    const sourceMaxLeads = Math.max(...(sourcePerformance?.map((s) => s.totalLeads) || [1]), 1);
    const trendsMaxLeads = Math.max(...(trends?.weekly?.map((w) => w.leadsCreated) || [1]), 1);
    
    const connectRate = followUpEffectiveness?.totalSessions > 0 
      ? ((followUpEffectiveness.connected / followUpEffectiveness.totalSessions) * 100).toFixed(1) 
      : 0;

    return {
      overview,
      funnel,
      funnelMaxCount,
      hasBottleneck,
      bottleneckStage,
      stagePerformance,
      followUpEffectiveness,
      connectRate,
      temperatureInsights,
      temperatureTotal,
      sourcePerformance,
      sourceMaxLeads,
      trends,
      trendsMaxLeads,
    };
  }, [analytics]);

  // Format last updated time
  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return null;
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return lastUpdated.toLocaleDateString();
  }, [lastUpdated]);

  // Show skeleton loader only on initial load without cached data
  if (loading && !analytics) {
    return <AnalyticsSkeleton />;
  }

  if (error && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!processedData) return null;

  const { 
    overview, funnel, funnelMaxCount, hasBottleneck, bottleneckStage,
    stagePerformance, followUpEffectiveness, connectRate,
    temperatureInsights, temperatureTotal,
    sourcePerformance, sourceMaxLeads,
    trends, trendsMaxLeads
  } = processedData;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500">Track your pipeline health and performance</p>
            {lastUpdatedText && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                • Updated {lastUpdatedText}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Background refresh indicator */}
      {isRefreshing && analytics && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-600 text-sm rounded-lg w-fit">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Updating data in background...</span>
        </div>
      )}

      {/* Error banner (when we have cached data but refresh failed) */}
      {error && analytics && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 text-sm rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-amber-500 hover:text-amber-700">
            ×
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          title="Active Leads"
          value={overview.activeLeads}
          subtitle={`${overview.totalLeads} total contacts`}
          icon={<Users className="w-5 h-5" />}
          color="sky"
        />
        <OverviewCard
          title="Conversion Rate"
          value={`${overview.conversionRate}%`}
          subtitle={`${overview.totalCustomers} customers won`}
          icon={<Target className="w-5 h-5" />}
          color="emerald"
          trend={overview.conversionRate > 10 ? "up" : "down"}
        />
        <OverviewCard
          title="Avg. Days to Close"
          value={overview.avgDaysToClose || "—"}
          subtitle="Lead to Customer"
          icon={<Clock className="w-5 h-5" />}
          color="purple"
        />
        <OverviewCard
          title="Needs Attention"
          value={overview.leadsNeedingAttention}
          subtitle="No contact in 7+ days"
          icon={<AlertCircle className="w-5 h-5" />}
          color={overview.leadsNeedingAttention > 5 ? "red" : "amber"}
          urgent={overview.leadsNeedingAttention > 5}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel - Takes 2 columns */}
        <div className="lg:col-span-2">
          <PipelineFunnel funnel={funnel} maxCount={funnelMaxCount} hasBottleneck={hasBottleneck} bottleneckStage={bottleneckStage} />
        </div>

        {/* Follow-up Effectiveness */}
        <div>
          <FollowUpEffectiveness data={followUpEffectiveness} connectRate={connectRate} />
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Performance */}
        <div>
          <StagePerformance data={stagePerformance} />
        </div>

        {/* Lead Temperature */}
        <div>
          <LeadTemperature data={temperatureInsights} total={temperatureTotal} />
        </div>

        {/* Source Performance */}
        <div>
          <SourcePerformance data={sourcePerformance} maxLeads={sourceMaxLeads} />
        </div>
      </div>

      {/* Trends & Stuck Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendsChart trends={trends} maxLeads={trendsMaxLeads} />
        <StuckLeads leads={stagePerformance?.stuckLeads || []} />
      </div>
    </div>
  );
}

// Overview Card Component
function OverviewCard({ title, value, subtitle, icon, color, trend, urgent }) {
  const colorClasses = {
    sky: "bg-sky-50 text-sky-600 border-sky-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <div className={`p-5 rounded-xl border-2 ${colorClasses[color]} ${urgent ? "animate-pulse" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color === "sky" ? "bg-sky-100" : color === "emerald" ? "bg-emerald-100" : color === "purple" ? "bg-purple-100" : color === "amber" ? "bg-amber-100" : "bg-red-100"}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
            {trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-70">{title}</p>
      <p className="text-xs mt-1 opacity-50">{subtitle}</p>
    </div>
  );
}

// Pipeline Funnel Component
function PipelineFunnel({ funnel, maxCount, hasBottleneck, bottleneckStage }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-semibold text-gray-800">Pipeline Funnel</h2>
      </div>

      <div className="space-y-3">
        {funnel?.map((stage, index) => {
          const colors = STATUS_COLORS[stage.stage] || STATUS_COLORS.LEAD;
          const widthPercent = (stage.count / maxCount) * 100;

          return (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.bg} ${colors.text}`}>
                    {stage.stage}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{stage.count}</span>
                </div>
                {index > 0 && stage.conversionRate && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`${parseFloat(stage.conversionRate) >= 50 ? "text-emerald-600" : parseFloat(stage.conversionRate) >= 25 ? "text-amber-600" : "text-red-500"}`}>
                      {stage.conversionRate}% converted
                    </span>
                    {stage.dropOff && parseFloat(stage.dropOff) > 50 && (
                      <span className="text-red-400 flex items-center gap-0.5">
                        <TrendingDown className="w-3 h-3" />
                        {stage.dropOff}% drop-off
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className={`h-full ${colors.accent} transition-all duration-500 rounded-lg flex items-center justify-end pr-2`}
                  style={{ width: `${Math.max(widthPercent, 5)}%` }}
                >
                  {widthPercent > 20 && (
                    <span className="text-xs text-white font-medium">{stage.count}</span>
                  )}
                </div>
              </div>
              {index < funnel.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowRight className="w-4 h-4 text-gray-300 rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottleneck Alert */}
      {hasBottleneck && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Bottleneck Detected</span>
          </div>
          <p className="text-xs text-red-500 mt-1">
            {bottleneckStage} stage has high drop-off. Consider reviewing qualification criteria.
          </p>
        </div>
      )}
    </div>
  );
}

// Follow-up Effectiveness Component
function FollowUpEffectiveness({ data, connectRate }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Phone className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-semibold text-gray-800">Follow-up Effectiveness</h2>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-600">{data.connected}</p>
          <p className="text-xs text-emerald-500">Connected</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-red-500">{data.notConnected}</p>
          <p className="text-xs text-red-400">No Answer</p>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-amber-600">{data.badTiming}</p>
          <p className="text-xs text-amber-500">Bad Timing</p>
        </div>
      </div>

      {/* Connect Rate */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">Connect Rate</span>
          <span className="text-sm font-medium text-gray-800">{connectRate}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${parseFloat(connectRate) >= 50 ? "bg-emerald-500" : parseFloat(connectRate) >= 30 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${connectRate}%` }}
          />
        </div>
      </div>

      {/* Quick Response Impact */}
      <div className="p-3 bg-gradient-to-r from-sky-50 to-indigo-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-sky-500" />
          <span className="text-sm font-medium text-gray-700">Response Speed Impact</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-sky-600">{data.quickResponseConversion.rate}%</p>
            <p className="text-xs text-gray-500">&lt;24hr response</p>
            <p className="text-xs text-gray-400">{data.quickResponseConversion.total} leads</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-500">{data.laterResponseConversion.rate}%</p>
            <p className="text-xs text-gray-500">&gt;24hr response</p>
            <p className="text-xs text-gray-400">{data.laterResponseConversion.total} leads</p>
          </div>
        </div>
        {parseFloat(data.quickResponseConversion.rate) > parseFloat(data.laterResponseConversion.rate) && (
          <p className="text-xs text-sky-600 mt-2 text-center">
            ⚡ Quick responses convert {(parseFloat(data.quickResponseConversion.rate) - parseFloat(data.laterResponseConversion.rate)).toFixed(0)}% better!
          </p>
        )}
      </div>

      {/* Avg Rating */}
      <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-600">Avg. Session Rating</span>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-gray-800">{data.avgRating}</span>
          <span className="text-sm text-gray-400">/10</span>
        </div>
      </div>
    </div>
  );
}

// Stage Performance Component
function StagePerformance({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-semibold text-gray-800">Stage Duration</h2>
      </div>

      <div className="space-y-3">
        {data.avgTimeInStage.map((stage) => {
          const colors = STATUS_COLORS[stage.stage] || STATUS_COLORS.LEAD;
          const isLong = stage.avgDays > 14;

          return (
            <div key={stage.stage} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${colors.accent}`} />
                <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
              </div>
              <div className={`text-sm font-medium ${isLong ? "text-amber-600" : "text-gray-600"}`}>
                {Math.round(stage.avgDays || 0)} days
                {isLong && <AlertCircle className="w-3 h-3 inline ml-1" />}
              </div>
            </div>
          );
        })}
      </div>

      {data.avgTimeInStage.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No stage data yet</p>
      )}
    </div>
  );
}

// Lead Temperature Component
function LeadTemperature({ data, total }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Thermometer className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-semibold text-gray-800">Lead Temperature</h2>
      </div>

      <div className="space-y-3">
        {["HOT", "WARM", "COLD"].map((temp) => {
          const item = data?.find((d) => d.temperature === temp) || { count: 0, converted: 0 };
          const colors = TEMPERATURE_COLORS[temp];
          const conversionRate = item.count > 0 ? ((item.converted / item.count) * 100).toFixed(0) : 0;

          return (
            <div key={temp} className={`p-3 rounded-lg ${colors.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{colors.icon}</span>
                  <span className={`text-sm font-medium ${colors.text}`}>{temp}</span>
                </div>
                <span className="text-sm font-bold text-gray-700">{item.count}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{((item.count / total) * 100).toFixed(0)}% of pipeline</span>
                <span className={colors.text}>{conversionRate}% conversion</span>
              </div>
            </div>
          );
        })}
      </div>

      {(!data || data.length === 0) && (
        <p className="text-sm text-gray-400 text-center py-4">Rate sessions to see temperature insights</p>
      )}
    </div>
  );
}

// Source Performance Component
function SourcePerformance({ data, maxLeads }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-semibold text-gray-800">Source Performance</h2>
      </div>

      <div className="space-y-3">
        {data?.slice(0, 5).map((source) => {
          const conversionRate = source.totalLeads > 0 ? ((source.converted / source.totalLeads) * 100).toFixed(0) : 0;
          const widthPercent = (source.totalLeads / maxLeads) * 100;

          return (
            <div key={source.source} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 truncate">{source.source}</span>
                <span className="text-xs text-gray-500">{source.totalLeads} leads</span>
              </div>
              <div className="h-5 bg-gray-100 rounded-md overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-md"
                  style={{ width: `${widthPercent}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-2">
                  <span className="text-xs font-medium text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    {conversionRate}% converted
                  </span>
                </div>
              </div>
              {source.avgDaysToClose && (
                <p className="text-xs text-gray-400 mt-0.5">Avg. {Math.round(source.avgDaysToClose)} days to close</p>
              )}
            </div>
          );
        })}
      </div>

      {(!data || data.length === 0) && (
        <p className="text-sm text-gray-400 text-center py-4">No source data yet</p>
      )}
    </div>
  );
}

// Trends Chart Component (Simple)
function TrendsChart({ trends, maxLeads }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Calendar className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-semibold text-gray-800">Weekly Trends</h2>
      </div>

      {trends?.weekly?.length > 0 ? (
        <div className="flex items-end gap-2 h-32">
          {trends.weekly.map((week, i) => {
            const height = (week.leadsCreated / maxLeads) * 100;
            const conversion = trends.conversions?.find((c) => c.week === week.week);

            return (
              <div key={week.week} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex flex-col items-center justify-end h-24">
                  <div
                    className="w-full bg-sky-400 rounded-t-md transition-all group-hover:bg-sky-500 relative"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  >
                    {conversion && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-emerald-400 rounded-t-sm"
                        style={{ height: `${(conversion.conversions / week.leadsCreated) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(week.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="text-xs font-medium text-gray-600 opacity-0 group-hover:opacity-100">
                  {week.leadsCreated}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">Not enough data for trends</p>
      )}

      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-sky-400 rounded" />
          <span className="text-gray-500">Leads Created</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-400 rounded" />
          <span className="text-gray-500">Conversions</span>
        </div>
      </div>
    </div>
  );
}

// Stuck Leads Component
function StuckLeads({ leads }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-gray-800">Stuck Leads</h2>
        <span className="text-xs text-gray-400">(14+ days in stage)</span>
      </div>

      {leads?.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {leads.map((lead) => {
            const colors = STATUS_COLORS[lead.status] || STATUS_COLORS.LEAD;

            return (
              <div key={lead.contact_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{lead.name}</p>
                  <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={`px-2 py-0.5 text-xs rounded ${colors.bg} ${colors.text}`}>
                    {lead.status}
                  </span>
                  <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
                    {lead.daysInStage}d
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No stuck leads! Great job keeping things moving.</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SKELETON LOADER - Shows content structure while loading (better UX than spinner)
// =============================================================================
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg" />
      </div>

      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-xl border-2 border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded mb-1" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="h-6 w-40 bg-gray-200 rounded mb-5" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-20 bg-gray-100 rounded" />
                  <div className="h-4 w-24 bg-gray-100 rounded" />
                </div>
                <div className="h-6 bg-gray-100 rounded-lg" style={{ width: `${100 - i * 15}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="h-6 w-40 bg-gray-200 rounded mb-5" />
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="w-5 h-5 bg-gray-200 rounded mx-auto mb-1" />
                <div className="h-5 w-8 bg-gray-200 rounded mx-auto mb-1" />
                <div className="h-3 w-12 bg-gray-100 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-6 w-32 bg-gray-200 rounded mb-5" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-4 w-12 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
