import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Filter,
  Calendar,
  RefreshCw,
  ChevronDown,
  Lightbulb,
  AlertCircle,
  ArrowRight,
  Star,
  Flame,
  UserCheck,
  BarChart3,
  PieChart,
  Activity,
  Award,
  X,
  Phone,
  Mail,
  Building2,
  TrendingUpIcon,
} from "lucide-react";
import {
  getInsights,
  getInsightFilters,
} from "../../services/analyticsService";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/currency";

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================
const CACHE_KEY = "insights_data";
const STALE_TIME = 3 * 60 * 1000; // 3 minutes
const CACHE_TIME = 15 * 60 * 1000; // 15 minutes

const insightsCache = {
  data: {},
  filtersData: null,
  timestamp: {},
  promise: {},
};

const getCacheKey = (filters) => JSON.stringify(filters);

const isCacheFresh = (key) => {
  if (!insightsCache.timestamp[key]) return false;
  return Date.now() - insightsCache.timestamp[key] < STALE_TIME;
};

const isCacheValid = (key) => {
  if (!insightsCache.timestamp[key]) return false;
  return Date.now() - insightsCache.timestamp[key] < CACHE_TIME;
};

// =============================================================================
// DATE PRESETS
// =============================================================================
const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "last90days", label: "Last 90 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

// =============================================================================
// INSIGHT TAB OPTIONS
// =============================================================================
const INSIGHT_TABS = [
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "customers", label: "Top Customers", icon: Award },
  { id: "bottlenecks", label: "Bottlenecks", icon: AlertTriangle },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function InsightsPanel() {
  const { isAdmin, company } = useAuth();
  const [activeTab, setActiveTab] = useState("performance");
  const [data, setData] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    datePreset: "last30days",
    startDate: "",
    endDate: "",
    source: "",
    assignedTo: "",
  });

  const isMountedRef = useRef(true);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      if (insightsCache.filtersData) {
        setFilterOptions(insightsCache.filtersData);
        return;
      }
      try {
        const options = await getInsightFilters();
        insightsCache.filtersData = options;
        if (isMountedRef.current) {
          setFilterOptions(options);
        }
      } catch (err) {
        console.warn("Failed to load filter options:", err);
      }
    };
    fetchFilters();
  }, []);

  // Build API filters from state
  const apiFilters = useMemo(() => {
    const f = {};
    if (filters.datePreset && filters.datePreset !== "custom") {
      f.datePreset = filters.datePreset;
    } else if (filters.startDate || filters.endDate) {
      if (filters.startDate) f.startDate = filters.startDate;
      if (filters.endDate) f.endDate = filters.endDate;
    }
    if (filters.source) f.source = filters.source;
    if (filters.assignedTo) f.assignedTo = filters.assignedTo;
    return f;
  }, [filters]);

  // Fetch insights data
  const fetchInsights = useCallback(
    async (forceRefresh = false) => {
      const cacheKey = getCacheKey(apiFilters);

      if (!forceRefresh && isCacheFresh(cacheKey) && insightsCache.data[cacheKey]) {
        return insightsCache.data[cacheKey];
      }

      if (insightsCache.promise[cacheKey]) {
        return insightsCache.promise[cacheKey];
      }

      insightsCache.promise[cacheKey] = (async () => {
        try {
          const result = await getInsights(apiFilters);
          insightsCache.data[cacheKey] = result;
          insightsCache.timestamp[cacheKey] = Date.now();
          return result;
        } finally {
          delete insightsCache.promise[cacheKey];
        }
      })();

      return insightsCache.promise[cacheKey];
    },
    [apiFilters]
  );

  // Load data effect
  useEffect(() => {
    isMountedRef.current = true;
    const cacheKey = getCacheKey(apiFilters);

    const loadData = async () => {
      if (isCacheValid(cacheKey) && insightsCache.data[cacheKey]) {
        setData(insightsCache.data[cacheKey]);
        setLoading(false);

        if (!isCacheFresh(cacheKey)) {
          setIsRefreshing(true);
          try {
            const freshData = await fetchInsights(true);
            if (isMountedRef.current) {
              setData(freshData);
            }
          } catch (err) {
            console.warn("Background refresh failed:", err);
          } finally {
            if (isMountedRef.current) setIsRefreshing(false);
          }
        }
      } else {
        setLoading(true);
        setError(null);
        try {
          const result = await fetchInsights(true);
          if (isMountedRef.current) {
            setData(result);
          }
        } catch (err) {
          console.error("Failed to fetch insights:", err);
          if (isMountedRef.current) {
            setError("Failed to load insights. Please try again.");
          }
        } finally {
          if (isMountedRef.current) setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, [apiFilters, fetchInsights]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const freshData = await fetchInsights(true);
      setData(freshData);
    } catch (err) {
      setError("Failed to refresh. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      datePreset: "last30days",
      startDate: "",
      endDate: "",
      source: "",
      assignedTo: "",
    });
  };

  // Check if filters are applied
  const hasActiveFilters = useMemo(() => {
    return (
      filters.datePreset !== "last30days" ||
      filters.source ||
      filters.assignedTo ||
      filters.startDate ||
      filters.endDate
    );
  }, [filters]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.datePreset && filters.datePreset !== "last30days") count++;
    if (filters.source) count++;
    if (filters.assignedTo) count++;
    if (filters.startDate || filters.endDate) count++;
    return count;
  }, [filters]);

  if (loading && !data) {
    return <InsightsSkeleton />;
  }

  if (error && !data) {
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

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-sky-50 border-sky-200 text-sky-700"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-sky-500 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors ${
            isRefreshing ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          filterOptions={filterOptions}
          isAdmin={isAdmin}
        />
      )}

      {/* Background refresh indicator */}
      {isRefreshing && data && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-600 text-sm rounded-lg w-fit">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Updating data...</span>
        </div>
      )}

      {/* Insight Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {INSIGHT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "performance" && <PerformanceTab data={data?.performance} trends={data?.trends} country={company?.country} />}
        {activeTab === "customers" && <CustomersTab data={data?.customers} country={company?.country} />}
        {activeTab === "bottlenecks" && <BottlenecksTab data={data?.bottlenecks} />}
        {activeTab === "recommendations" && <RecommendationsTab data={data?.recommendations} country={company?.country} />}
      </div>
    </div>
  );
}

// =============================================================================
// FILTER PANEL
// =============================================================================
const FilterPanel = memo(function FilterPanel({ filters, setFilters, filterOptions, isAdmin }) {
  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date Range
          </label>
          <select
            value={filters.datePreset}
            onChange={(e) =>
              setFilters((f) => ({ ...f, datePreset: e.target.value }))
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Range */}
        {filters.datePreset === "custom" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, startDate: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, endDate: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </>
        )}

        {/* Source Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Building2 className="w-4 h-4 inline mr-1" />
            Lead Source
          </label>
          <select
            value={filters.source}
            onChange={(e) =>
              setFilters((f) => ({ ...f, source: e.target.value }))
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="">All Sources</option>
            {filterOptions?.sources?.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned To Filter - Admin Only */}
        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <UserCheck className="w-4 h-4 inline mr-1" />
              Assigned To
            </label>
            <select
              value={filters.assignedTo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, assignedTo: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="">All Team Members</option>
              {filterOptions?.employees?.map((emp) => (
                <option key={emp.empId} value={emp.empId}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// PERFORMANCE TAB
// =============================================================================
const PerformanceTab = memo(function PerformanceTab({ data, trends, country }) {
  if (!data) {
    return <TabPlaceholder message="No performance data available" />;
  }

  const { revenue, pipeline, conversion, winLoss, velocity } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(revenue?.totalRevenue || 0, country)}
          change={revenue?.revenueGrowth}
          subtitle="Closed deals value"
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
        />

        {/* Pipeline Value */}
        <MetricCard
          title="Pipeline Value"
          value={formatCurrency(pipeline?.totalPipelineValue || 0, country)}
          subtitle={`${pipeline?.activeOpportunities || 0} active opportunities`}
          icon={<Target className="w-5 h-5" />}
          color="sky"
        />

        {/* Conversion Rate */}
        <MetricCard
          title="Lead → Customer"
          value={`${conversion?.leadToCustomerRate || 0}%`}
          change={conversion?.rateChange}
          subtitle="Overall conversion"
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />

        {/* Avg Deal Cycle */}
        <MetricCard
          title="Avg. Deal Cycle"
          value={`${velocity?.avgDaysToClose || 0} days`}
          subtitle="Lead to close"
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Win/Loss Analysis */}
      {winLoss && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-sky-500" />
            Win/Loss Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-3xl font-bold text-emerald-600">
                {winLoss.won || 0}
              </div>
              <div className="text-sm text-emerald-700">Deals Won</div>
              <div className="text-xs text-emerald-500 mt-1">
                {winLoss.winRate || 0}% win rate
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">
                {winLoss.lost || 0}
              </div>
              <div className="text-sm text-red-700">Deals Lost</div>
              <div className="text-xs text-red-500 mt-1">
                {winLoss.lossRate || 0}% loss rate
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-600">
                {winLoss.pending || 0}
              </div>
              <div className="text-sm text-gray-700">In Progress</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(winLoss.pendingValue || 0, country)} pipeline
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends Chart */}
      {trends?.data?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-500" />
            Performance Trends ({trends.period})
          </h3>
          <TrendsChart data={trends.data} />
        </div>
      )}
    </div>
  );
});

// =============================================================================
// CUSTOMERS TAB
// =============================================================================
const CustomersTab = memo(function CustomersTab({ data, country }) {
  if (!data) {
    return <TabPlaceholder message="No customer data available" />;
  }

  const { topCustomers, segments, repeatCustomers } = data;

  return (
    <div className="space-y-6">
      {/* Customer Segments */}
      {segments && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-sky-500" />
            Customer Segments
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {segments.map((seg) => (
              <SegmentCard key={seg.segment} segment={seg} country={country} />
            ))}
          </div>
        </div>
      )}

      {/* Top Customers Table */}
      {topCustomers?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Top Customers by Revenue
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Total Revenue</th>
                  <th className="pb-3 font-medium">Deals</th>
                  <th className="pb-3 font-medium">Avg. Deal Size</th>
                  <th className="pb-3 font-medium">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topCustomers.map((customer, idx) => (
                  <tr key={customer.contactId || idx} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-medium">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {customer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.company || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-emerald-600">
                      {formatCurrency(customer.totalRevenue, country)}
                    </td>
                    <td className="py-3 text-gray-700">{customer.dealCount}</td>
                    <td className="py-3 text-gray-700">
                      {formatCurrency(customer.avgDealSize, country)}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {customer.lastActivity
                        ? formatDate(customer.lastActivity)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repeat Customers */}
      {repeatCustomers && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Customer Loyalty
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-3xl font-bold text-amber-600">
                {repeatCustomers.count || 0}
              </div>
              <div className="text-sm text-amber-700">Repeat Customers</div>
            </div>
            <div className="text-center p-4 bg-sky-50 rounded-lg">
              <div className="text-3xl font-bold text-sky-600">
                {repeatCustomers.percentage || 0}%
              </div>
              <div className="text-sm text-sky-700">Repeat Rate</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-3xl font-bold text-emerald-600">
                {formatCurrency(repeatCustomers.avgLifetimeValue || 0, country)}
              </div>
              <div className="text-sm text-emerald-700">Avg. LTV</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// BOTTLENECKS TAB
// =============================================================================
const BottlenecksTab = memo(function BottlenecksTab({ data }) {
  if (!data) {
    return <TabPlaceholder message="No bottleneck data available" />;
  }

  const { stageStagnation, stuckContacts, lostReasons, dropOffAnalysis } = data;

  return (
    <div className="space-y-6">
      {/* Stage Stagnation */}
      {stageStagnation?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Stage Duration Analysis
          </h3>
          <div className="space-y-3">
            {stageStagnation.map((stage) => (
              <StageBar key={stage.stage} stage={stage} />
            ))}
          </div>
        </div>
      )}

      {/* Stuck Contacts */}
      {stuckContacts?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Contacts Needing Attention
            <span className="ml-auto text-sm font-normal text-gray-500">
              {stuckContacts.length} stuck &gt; 14 days
            </span>
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stuckContacts.map((contact) => (
              <StuckContactRow key={contact.contactId} contact={contact} />
            ))}
          </div>
        </div>
      )}

      {/* Lost Reasons */}
      {lostReasons?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Why Deals Are Lost
          </h3>
          <div className="space-y-3">
            {lostReasons.map((reason, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
              >
                <span className="text-red-700">{reason.reason || "No reason specified"}</span>
                <span className="font-semibold text-red-600">{reason.count} deals</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop-off Analysis */}
      {dropOffAnalysis?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-orange-500" />
            Stage Drop-off Rates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dropOffAnalysis.map((item) => (
              <div
                key={`${item.fromStage}-${item.toStage}`}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded">
                    {item.fromStage}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded">
                    {item.toStage}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      item.dropOffRate > 50 ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {item.dropOffRate}%
                  </span>
                  <span className="text-sm text-gray-500">drop-off</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// RECOMMENDATIONS TAB
// =============================================================================
const RecommendationsTab = memo(function RecommendationsTab({ data }) {
  if (!data || data.length === 0) {
    return (
      <TabPlaceholder
        message="No recommendations at this time"
        icon={<CheckCircle className="w-12 h-12 text-emerald-400" />}
        subtext="You're all caught up! Check back later for new insights."
      />
    );
  }

  // Group by priority
  const highPriority = data.filter((r) => r.priority <= 2);
  const mediumPriority = data.filter((r) => r.priority > 2 && r.priority <= 4);
  const lowPriority = data.filter((r) => r.priority > 4);

  return (
    <div className="space-y-6">
      {/* High Priority */}
      {highPriority.length > 0 && (
        <RecommendationGroup
          title="High Priority"
          items={highPriority}
          color="red"
          icon={<Flame className="w-5 h-5" />}
        />
      )}

      {/* Medium Priority */}
      {mediumPriority.length > 0 && (
        <RecommendationGroup
          title="Opportunities"
          items={mediumPriority}
          color="amber"
          icon={<Lightbulb className="w-5 h-5" />}
        />
      )}

      {/* Low Priority */}
      {lowPriority.length > 0 && (
        <RecommendationGroup
          title="Suggestions"
          items={lowPriority}
          color="sky"
          icon={<Zap className="w-5 h-5" />}
        />
      )}
    </div>
  );
});

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const MetricCard = memo(function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon,
  color,
}) {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    sky: "bg-sky-50 text-sky-600 border-sky-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
  };

  const iconBg = {
    emerald: "bg-emerald-100",
    sky: "bg-sky-100",
    purple: "bg-purple-100",
    amber: "bg-amber-100",
  };

  return (
    <div className={`p-5 rounded-xl border-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconBg[color]}`}>{icon}</div>
        {change !== undefined && change !== null && (
          <div
            className={`flex items-center gap-1 text-sm ${
              change >= 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-70">{title}</p>
      {subtitle && <p className="text-xs mt-1 opacity-50">{subtitle}</p>}
    </div>
  );
});

const SegmentCard = memo(function SegmentCard({ segment, country }) {
  const colors = {
    Enterprise: { bg: "bg-purple-100", text: "text-purple-700" },
    "Mid-Market": { bg: "bg-sky-100", text: "text-sky-700" },
    SMB: { bg: "bg-emerald-100", text: "text-emerald-700" },
    Starter: { bg: "bg-gray-100", text: "text-gray-700" },
  };

  const style = colors[segment.segment] || colors.Starter;

  return (
    <div className={`p-4 rounded-lg ${style.bg}`}>
      <div className={`text-2xl font-bold ${style.text}`}>
        {segment.count || 0}
      </div>
      <div className={`text-sm ${style.text}`}>{segment.segment}</div>
      <div className="text-xs opacity-70 mt-1">
        {formatCurrency(segment.totalRevenue || 0, country)}
      </div>
    </div>
  );
});

const StageBar = memo(function StageBar({ stage }) {
  const maxDays = 30; // Normalize to 30 days max
  const width = Math.min((stage.avgDays / maxDays) * 100, 100);
  const isWarning = stage.avgDays > 14;
  const isDanger = stage.avgDays > 21;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
        <span
          className={`text-sm font-semibold ${
            isDanger ? "text-red-600" : isWarning ? "text-amber-600" : "text-gray-600"
          }`}
        >
          {stage.avgDays} days avg
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {stage.contactCount} contacts in this stage
      </div>
    </div>
  );
});

const StuckContactRow = memo(function StuckContactRow({ contact }) {
  return (
    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{contact.name}</div>
          <div className="text-sm text-gray-500">
            {contact.currentStage} • {contact.daysStuck} days stuck
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 text-gray-400 hover:text-sky-600 hover:bg-white rounded-lg transition-colors">
          <Phone className="w-4 h-4" />
        </button>
        <button className="p-2 text-gray-400 hover:text-sky-600 hover:bg-white rounded-lg transition-colors">
          <Mail className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

const RecommendationGroup = memo(function RecommendationGroup({
  title,
  items,
  color,
  icon,
}) {
  const colorClasses = {
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    sky: "border-sky-200 bg-sky-50",
  };

  const headerColor = {
    red: "text-red-700",
    amber: "text-amber-700",
    sky: "text-sky-700",
  };

  return (
    <div className={`rounded-xl border-2 ${colorClasses[color]} p-5`}>
      <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${headerColor[color]}`}>
        {icon}
        {title}
        <span className="ml-auto text-sm font-normal opacity-70">
          {items.length} items
        </span>
      </h3>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <RecommendationCard key={idx} item={item} />
        ))}
      </div>
    </div>
  );
});

const RecommendationCard = memo(function RecommendationCard({ item }) {
  const typeIcons = {
    hot_lead: <Flame className="w-5 h-5 text-red-500" />,
    at_risk: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    cooling_lead: <Clock className="w-5 h-5 text-blue-500" />,
    ready_sql: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    upsell: <TrendingUp className="w-5 h-5 text-purple-500" />,
    source_insight: <BarChart3 className="w-5 h-5 text-sky-500" />,
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {typeIcons[item.type] || <Lightbulb className="w-5 h-5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{item.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          {item.actionUrl && (
            <a
              href={item.actionUrl}
              className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 mt-2"
            >
              Take Action
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
});

const TrendsChart = memo(function TrendsChart({ data }) {
  if (!data?.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No trend data available</p>
      </div>
    );
  }

  // Find the maximum value across all metrics for scaling
  const maxValue = Math.max(
    ...data.map(d =>
      Math.max(
        Number(d.leadsCreated ?? d.leads ?? 0),
        Number(d.conversions ?? d.converted ?? 0)
      )
    ),
    1
  );
  

  return (
    <div className="space-y-4">
      {/* Bar chart visualization */}
      <div className="space-y-2">
        <div className="flex items-end gap-1 h-48 border-b border-gray-200 pb-2">
          {data.map((item, idx) => {
            const leadsValue = Number(item.leadsCreated || item.leads || 0);
            const conversionsValue = Number(item.conversions || item.converted || 0);
            const leadsHeight = (leadsValue / maxValue) * 100;
            const conversionsHeight = (conversionsValue / maxValue) * 100;

            return (
              <div key={idx} className="relative flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex flex-col items-center justify-end h-full gap-0.5">
                  {/* Leads bar */}
                  <div
                    className="w-full bg-sky-500 rounded-t transition-all hover:bg-sky-600 cursor-pointer"
                    style={{ height: `${leadsHeight}%`, minHeight: leadsValue > 0 ? "4px" : "0" }}
                    title={`${leadsValue} new leads`}
                  />
                  {/* Conversions bar */}
                  <div
                    className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600 cursor-pointer"
                    style={{ height: `${conversionsHeight}%`, minHeight: conversionsValue > 0 ? "4px" : "0" }}
                    title={`${conversionsValue} conversions`}
                  />
                </div>
                {/* Label */}
                <span className="text-[10px] text-gray-500 truncate w-full text-center mt-1">
                  {item.label || item.week || item.month || `W${idx + 1}`}
                </span>
                {/* Tooltip on hover */}
                <div className="hidden group-hover:block absolute bg-gray-800 text-white text-xs rounded px-2 py-1 mt-1 z-10 whitespace-nowrap">
                  {item.label || `Period ${idx + 1}`}<br/>
                  Leads: {leadsValue}<br/>
                  Conversions: {conversionsValue}
                  {Number(item.revenue) > 0 && <><br/>Revenue: ${Number(item.revenue).toFixed(0)}</>}
                </div>
              </div>
            );
          })}
        </div>
        {/* X-axis labels for longer datasets */}
        {data.length > 12 && (
          <div className="flex justify-between text-xs text-gray-400 px-1">
            <span>{data[0]?.label || 'Start'}</span>
            <span>{data[Math.floor(data.length / 2)]?.label || 'Mid'}</span>
            <span>{data[data.length - 1]?.label || 'End'}</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-sky-500 rounded" />
          <span className="text-gray-600">New Leads</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded" />
          <span className="text-gray-600">Conversions</span>
        </div>
      </div>
    </div>
  );
});

const TabPlaceholder = memo(function TabPlaceholder({ message, icon, subtext }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      {icon || <AlertCircle className="w-12 h-12 text-gray-300" />}
      <p className="text-gray-500 mt-3">{message}</p>
      {subtext && <p className="text-sm text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
});

const InsightsSkeleton = memo(function InsightsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-48" />
      <div className="h-12 bg-gray-100 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
