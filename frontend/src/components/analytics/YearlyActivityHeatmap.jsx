import { useState, useEffect, useMemo, useCallback, memo, act } from "react";
import { Calendar, ChevronDown, Flame, Activity } from "lucide-react";
import { getYearlyActivityHeatmap } from "../../services/analyticsService";

// =============================================================================
// CACHE CONFIGURATION - Similar to other analytics components
// =============================================================================
const CACHE_KEY_PREFIX = 'activity_heatmap_';
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

// Module-level cache per year
const heatmapCache = new Map();

const getCacheKey = (year) => `${CACHE_KEY_PREFIX}${year || 'current'}`;

const isCacheFresh = (year) => {
  const cached = heatmapCache.get(getCacheKey(year));
  if (!cached?.timestamp) return false;
  return Date.now() - cached.timestamp < STALE_TIME;
};

// =============================================================================
// COLOR INTENSITY LEVELS (Blue theme matching enhanced analytics)
// =============================================================================
const getActivityColor = (count, maxCount) => {
  if (count === 0) return "bg-slate-100";
  
  const intensity = count / Math.max(maxCount, 1);
  
  if (intensity > 0.75) return "bg-sky-600";
  if (intensity > 0.5) return "bg-sky-500";
  if (intensity > 0.25) return "bg-sky-400";
  return "bg-sky-200";
};

// Month names for labels
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
function YearlyActivityHeatmap() {
  const [selectedYear, setSelectedYear] = useState('current');
  const [availableYears, setAvailableYears] = useState(['current']);
  const [activityData, setActivityData] = useState({});
  const [maxCount, setMaxCount] = useState(1);
  const [stats, setStats] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);

  // Fetch data function with caching
  const fetchHeatmapData = useCallback(async (year = 'current', forceRefresh = false) => {
    const cacheKey = getCacheKey(year);
    
    // Return cached data if fresh
    if (!forceRefresh && isCacheFresh(year)) {
      const cached = heatmapCache.get(cacheKey);
      return cached.data;
    }

    const data = await getYearlyActivityHeatmap(year === 'current' ? null : year);
    
    // Update cache
    heatmapCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }, []);

  // Load data on mount and year change
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchHeatmapData(selectedYear);
        
        if (!isMounted) return;
        
        setAvailableYears(data.availableYears || ['current']);
        setActivityData(data.activityMap || {});
        setMaxCount(data.maxCount || 1);
        setStats(data.stats || null);
        setDateRange({ start: data.startDate, end: data.endDate });
      } catch (err) {
        console.error("Failed to fetch heatmap data:", err);
        if (isMounted) setError("Failed to load activity data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    
    return () => { isMounted = false; };
  }, [fetchHeatmapData, selectedYear]);

  // Handle year change
  const handleYearChange = useCallback((year) => {
    setSelectedYear(year);
    setIsDropdownOpen(false);
  }, []);

  // Generate calendar grid data - optimized with single pass
  // Grid flows left-to-right, top-to-bottom with today at bottom-right
  const { calendarData, monthLabels } = useMemo(() => {
    if (!dateRange.start || !dateRange.end) {
      return { calendarData: [], monthLabels: [] };
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // For proper grid: end on today's column, start from ~1 year ago
    // End date should be in the last column, on its day of week row
    const gridEnd = new Date(endDate);
    
    // Calculate grid start: go back enough weeks to cover the range
    // We need ~53 weeks for a full year
    const gridStart = new Date(endDate);
    gridStart.setDate(gridStart.getDate() - 363); // ~52 weeks back
    // Adjust to previous Sunday
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    
    const weeks = [];
    const labels = [];
    let currentDate = new Date(gridStart);
    let currentWeek = [];
    let lastMonth = -1;
    let weekIndex = 0;
    
    while (currentDate <= gridEnd) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const isInRange = currentDate >= startDate && currentDate <= endDate;
      const month = currentDate.getMonth();
      const dayData = activityData[dateStr];
      
      // Track month changes for labels
      if (isInRange && month !== lastMonth) {
        labels.push({ month, weekIndex });
        lastMonth = month;
      }
      
      currentWeek.push({
        date: new Date(currentDate),
        dateStr,
        isInRange,
        count: dayData?.count || 0,
        connected: dayData?.connected || 0,
        avgRating: Number(dayData?.avgRating) || 0,
        isToday: dateStr === new Date().toISOString().split('T')[0],
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
        weekIndex++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add remaining days as final partial week
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return { calendarData: weeks, monthLabels: labels };
  }, [dateRange, activityData]);

  const today = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    for (const week of calendarData) {
      const day = week.find(d => d.dateStr === todayStr);
      if (day) return day;
    }
    return null;
  }, [calendarData]);

  const activeDay = hoveredDay || today;

  const monthStartWeeks = useMemo(() => {
    return new Set(monthLabels.map(m => m.weekIndex));
  }, [monthLabels]);


  // Format year display
  const getYearDisplayText = useCallback((year) => {
    return year === 'current' ? 'Current' : year;
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-6 w-48 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded" />
          </div>
          <div className="h-[100px] bg-gray-50 rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 text-red-500">
          <Activity className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const isRollingYear = selectedYear === 'current';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full flex flex-col">
      {/* Header - LeetCode Style */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          {/* Main stat */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-800">
              {stats?.totalSessions || 0}
            </span>
            <span className="text-sm text-gray-500">
              sessions {isRollingYear ? 'in the past one year' : `in ${selectedYear}`}
            </span>
          </div>
          
          {/* Secondary stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-500" />
              <span>Total active days: <span className="font-medium text-gray-700">{stats?.activeDays || 0}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Max streak: <span className="font-medium text-gray-700">{stats?.maxStreak || 0}</span></span>
            </div>
          </div>
        </div>

        {/* Year Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-150 transition-colors"
          >
            <span className="font-medium">{getYearDisplayText(selectedYear)}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)}
              />
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px] max-h-[200px] overflow-y-auto">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearChange(year)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      year === selectedYear ? 'bg-sky-50 text-sky-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {getYearDisplayText(year)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="w-full">
          {/* Month Labels - positioned above grid */}
          <div className="relative h-4 mb-2">
            {monthLabels.map(({ month, weekIndex }, idx) => (
              <span
                key={`${month}-${weekIndex}`}
                className="absolute text-xs text-gray-400"
                style={{ left: `${weekIndex * 16 + idx * 10}px` }}
              >
                {MONTH_NAMES[month]}
              </span>
            ))}
          </div>


          {/* Grid Container - horizontal scroll wrapper */}
          <div className="flex gap-[3px]">
            {calendarData.map((week, weekIdx) => (
              <div key={`wrap-${weekIdx}`} className="flex">
                {/* Month gap */}
                {monthStartWeeks.has(weekIdx) && weekIdx !== 0 && (
                  <div className="w-[10px]" />
                )}

                {/* Week column */}
                <div className="flex flex-col gap-[3px] w-[13px]">
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`w-[13px] h-[13px] rounded-sm transition-all ${
                        day.isInRange
                          ? `${getActivityColor(day.count, maxCount)} hover:ring-2 hover:ring-sky-300 hover:ring-offset-1 cursor-pointer ${day.isToday ? 'ring-2 ring-gray-400' : ''}`
                          : 'bg-transparent'
                      }`}
                      onMouseEnter={() => day.isInRange && setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500">
            <span>Less</span>
            <div className="flex gap-[3px]">
              <div className="w-[13px] h-[13px] rounded-sm bg-slate-100" />
              <div className="w-[13px] h-[13px] rounded-sm bg-sky-200" />
              <div className="w-[13px] h-[13px] rounded-sm bg-sky-400" />
              <div className="w-[13px] h-[13px] rounded-sm bg-sky-500" />
              <div className="w-[13px] h-[13px] rounded-sm bg-sky-600" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {activeDay && (
        <div className="mt-3 px-4 py-3 bg-slate-50 rounded-lg text-sm border border-slate-100">
          <div className="flex items-center gap-2 font-medium text-gray-800">
            {activeDay.date.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
            {activeDay === today && (
              <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-700">
                Today
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-1 text-gray-600">
            {activeDay.count === 0 ? (
              <span>No sessions</span>
            ) : (
              <>
                <span>{activeDay.count} {activeDay.count === 1 ? 'session' : 'sessions'}</span>
                {activeDay.connected > 0 && <span>• {activeDay.connected} connected</span>}
                {activeDay.avgRating > 0 && <span>• {activeDay.avgRating.toFixed(1)}★</span>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(YearlyActivityHeatmap);
