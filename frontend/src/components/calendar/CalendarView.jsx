import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Phone,
  Mail,
  Users,
  Target,
  Bell,
  CheckCircle,
  AlertCircle,
  X,
  Filter,
  Zap,
  CalendarDays,
  ListTodo,
  RefreshCw,
} from "lucide-react";
import {
  getCalendarTasks,
  getTodaysTasks,
  getWeeksTasks,
  getOverdueTasks,
  getTaskStats,
  createTask,
  updateTask,
  deleteTask,
  getCalendarSyncStatus,
  syncAllToGoogleCalendar,
  resolveOverdueTask,
} from "../../services/taskService";
import { getContacts } from "../../services/contactService";
import { StatCard, TaskCard, TaskModal } from '../calendar';
import { TASK_TYPES, PRIORITY_COLORS, STATUS_COLORS, toLocalDateOnly } from "./constants";

// =============================================================================
// CACHE CONFIGURATION - Persists data across component remounts (tab switches)
// =============================================================================
const STALE_TIME = 3 * 60 * 1000; // 3 minutes - calendar data changes more frequently
const CACHE_TIME = 15 * 60 * 1000; // 15 minutes

// Module-level cache
const calendarCache = {
  // Monthly task data keyed by "YYYY-MM"
  monthlyTasks: new Map(),
  // Static data that doesn't change often
  todaysTasks: null,
  overdueTasks: null,
  stats: null,
  contacts: null,
  // Timestamps
  staticDataTimestamp: null,
  // Request deduplication
  pendingRequests: new Map(),
};

// Helper functions
const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const isStaticDataFresh = () => {
  if (!calendarCache.staticDataTimestamp) return false;
  return Date.now() - calendarCache.staticDataTimestamp < STALE_TIME;
};

const isStaticDataValid = () => {
  if (!calendarCache.staticDataTimestamp) return false;
  return Date.now() - calendarCache.staticDataTimestamp < CACHE_TIME;
};

const isMonthDataFresh = (monthKey) => {
  const cached = calendarCache.monthlyTasks.get(monthKey);
  if (!cached?.timestamp) return false;
  return Date.now() - cached.timestamp < STALE_TIME;
};

const isMonthDataValid = (monthKey) => {
  const cached = calendarCache.monthlyTasks.get(monthKey);
  if (!cached?.timestamp) return false;
  return Date.now() - cached.timestamp < CACHE_TIME;
};


const CalendarView = ({ isAdmin = false }) => {
  // Theme colors based on admin status - admin uses softer amber/warm tones
  const themeColors = isAdmin ? {
    primary: 'from-amber-500 to-orange-500',
    primaryHover: 'hover:from-amber-600 hover:to-orange-600',
    activeButton: 'bg-white text-amber-600 shadow-sm',
    textPrimary: 'text-amber-600',
    textHover: 'hover:text-amber-700',
    bgHover: 'hover:bg-amber-50',
    ringColor: 'ring-amber-500',
    bgLight: 'bg-amber-50',
    focusRing: 'focus:ring-amber-500',
    spinner: 'text-amber-500',
    dotColor: 'bg-amber-500',
  } : {
    primary: 'from-sky-500 to-blue-600',
    primaryHover: 'hover:from-sky-600 hover:to-blue-700',
    activeButton: 'bg-white text-sky-600 shadow-sm',
    textPrimary: 'text-sky-600',
    textHover: 'hover:text-sky-700',
    bgHover: 'hover:bg-sky-50',
    ringColor: 'ring-sky-500',
    bgLight: 'bg-sky-50',
    focusRing: 'focus:ring-sky-500',
    spinner: 'text-sky-500',
    dotColor: 'bg-sky-500',
  };
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'today'
  const [focusMode, setFocusMode] = useState(null); // null, 'today', 'week', 'availabilities'
  
  // Initialize state from cache if available
  const [tasks, setTasks] = useState(() => {
    const monthKey = getMonthKey(new Date());
    return calendarCache.monthlyTasks.get(monthKey)?.data || [];
  });
  const [todaysTasks, setTodaysTasks] = useState(() => calendarCache.todaysTasks || []);
  const [overdueTasks, setOverdueTasks] = useState(() => calendarCache.overdueTasks || []);
  const [stats, setStats] = useState(() => calendarCache.stats);
  const [contacts, setContacts] = useState(() => calendarCache.contacts || []);
  
  // Loading states
  const [initialLoading, setInitialLoading] = useState(() => !isStaticDataValid());
  const [refreshing, setRefreshing] = useState(false);
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState(() => 
    calendarCache.staticDataTimestamp ? new Date(calendarCache.staticDataTimestamp) : null
  );

  // Google Calendar sync state
  const [gcalConnected, setGcalConnected] = useState(null); // null=loading, true, false
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  
  // Track mounted state
  const isMountedRef = useRef(true);

  // Check Google Calendar connection on mount
  useEffect(() => {
    const checkGcal = async () => {
      try {
        const status = await getCalendarSyncStatus();
        if (isMountedRef.current) setGcalConnected(status.connected);
      } catch {
        if (isMountedRef.current) setGcalConnected(false);
      }
    };
    checkGcal();
  }, []);

  // Handle sync all tasks to Google Calendar
  const handleSyncAll = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncAllToGoogleCalendar();
      if (isMountedRef.current) {
        setSyncResult(result);
        // Auto-clear the toast after 4 seconds
        setTimeout(() => {
          if (isMountedRef.current) setSyncResult(null);
        }, 4000);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSyncResult({ error: err.response?.data?.message || 'Sync failed' });
        setTimeout(() => {
          if (isMountedRef.current) setSyncResult(null);
        }, 4000);
      }
    } finally {
      if (isMountedRef.current) setIsSyncing(false);
    }
  }, [isSyncing]);

  // Format date to YYYY-MM-DD (local timezone)
  const formatDate = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch monthly tasks with caching
  const fetchMonthlyTasks = useCallback(async (date, forceRefresh = false) => {
    const monthKey = getMonthKey(date);
    
    // Return cached data if fresh and not forcing refresh
    if (!forceRefresh && isMonthDataFresh(monthKey)) {
      return calendarCache.monthlyTasks.get(monthKey)?.data || [];
    }

    // Deduplicate concurrent requests
    const requestKey = `month-${monthKey}`;
    if (calendarCache.pendingRequests.has(requestKey)) {
      return calendarCache.pendingRequests.get(requestKey);
    }

    const promise = (async () => {
      try {
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const calendarTasks = await getCalendarTasks(formatDate(start), formatDate(end));
        const normalizedTasks = calendarTasks.map(task => ({
          ...task,
          due_date: toLocalDateOnly(task.due_date),
        }));
        
        // Update cache
        calendarCache.monthlyTasks.set(monthKey, {
          data: normalizedTasks,
          timestamp: Date.now(),
        });
        
        return normalizedTasks;
      } finally {
        calendarCache.pendingRequests.delete(requestKey);
      }
    })();

    calendarCache.pendingRequests.set(requestKey, promise);
    return promise;
  }, [formatDate]);

  // Fetch static data (stats, today, overdue, contacts) with caching
  const fetchStaticData = useCallback(async (forceRefresh = false) => {
    // Return cached data if fresh
    if (!forceRefresh && isStaticDataFresh()) {
      return {
        todaysTasks: calendarCache.todaysTasks,
        overdueTasks: calendarCache.overdueTasks,
        stats: calendarCache.stats,
        contacts: calendarCache.contacts,
      };
    }

    // Deduplicate concurrent requests
    const requestKey = 'static-data';
    if (calendarCache.pendingRequests.has(requestKey)) {
      return calendarCache.pendingRequests.get(requestKey);
    }

    const promise = (async () => {
      try {
        const [today, overdue, taskStats, contactList] = await Promise.all([
          getTodaysTasks(),
          getOverdueTasks(),
          getTaskStats(),
          getContacts({}).catch(() => []),
        ]);

        // Update cache
        calendarCache.todaysTasks = today;
        calendarCache.overdueTasks = overdue;
        calendarCache.stats = taskStats;
        calendarCache.contacts = Array.isArray(contactList) ? contactList : [];
        calendarCache.staticDataTimestamp = Date.now();

        return {
          todaysTasks: today,
          overdueTasks: overdue,
          stats: taskStats,
          contacts: calendarCache.contacts,
        };
      } finally {
        calendarCache.pendingRequests.delete(requestKey);
      }
    })();

    calendarCache.pendingRequests.set(requestKey, promise);
    return promise;
  }, []);

  // Invalidate cache (called after mutations)
  const invalidateCache = useCallback(() => {
    calendarCache.staticDataTimestamp = null;
    calendarCache.monthlyTasks.clear();
  }, []);

  // Initial load with stale-while-revalidate
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadInitialData = async () => {
      const monthKey = getMonthKey(currentDate);
      
      // Check if we have valid cached data
      const hasValidStaticData = isStaticDataValid();
      const hasValidMonthData = isMonthDataValid(monthKey);
      
      if (hasValidStaticData && hasValidMonthData) {
        // Use cached data immediately
        setTasks(calendarCache.monthlyTasks.get(monthKey)?.data || []);
        setTodaysTasks(calendarCache.todaysTasks || []);
        setOverdueTasks(calendarCache.overdueTasks || []);
        setStats(calendarCache.stats);
        setContacts(calendarCache.contacts || []);
        setLastUpdated(new Date(calendarCache.staticDataTimestamp));
        setInitialLoading(false);
        
        // Background revalidate if stale
        if (!isStaticDataFresh() || !isMonthDataFresh(monthKey)) {
          setIsBackgroundRefresh(true);
          try {
            const [monthTasks, staticData] = await Promise.all([
              fetchMonthlyTasks(currentDate, true),
              fetchStaticData(true),
            ]);
            
            if (isMountedRef.current) {
              setTasks(monthTasks);
              setTodaysTasks(staticData.todaysTasks);
              setOverdueTasks(staticData.overdueTasks);
              setStats(staticData.stats);
              setContacts(staticData.contacts);
              setLastUpdated(new Date());
            }
          } catch (err) {
            console.warn("Background refresh failed:", err);
          } finally {
            if (isMountedRef.current) {
              setIsBackgroundRefresh(false);
            }
          }
        }
      } else {
        // No valid cache, do full load
        setInitialLoading(true);
        try {
          const [monthTasks, staticData] = await Promise.all([
            fetchMonthlyTasks(currentDate, true),
            fetchStaticData(true),
          ]);
          
          if (isMountedRef.current) {
            setTasks(monthTasks);
            setTodaysTasks(staticData.todaysTasks);
            setOverdueTasks(staticData.overdueTasks);
            setStats(staticData.stats);
            setContacts(staticData.contacts);
            setLastUpdated(new Date());
          }
        } catch (error) {
          console.error("Failed to fetch calendar data:", error);
        } finally {
          if (isMountedRef.current) {
            setInitialLoading(false);
          }
        }
      }
    };

    loadInitialData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Month navigation - fetch month data with cache
  useEffect(() => {
    if (initialLoading) return;
    
    const loadMonthData = async () => {
      const monthKey = getMonthKey(currentDate);
      
      // Check cache first
      if (isMonthDataValid(monthKey)) {
        setTasks(calendarCache.monthlyTasks.get(monthKey)?.data || []);
        
        // Background refresh if stale
        if (!isMonthDataFresh(monthKey)) {
          setRefreshing(true);
          try {
            const monthTasks = await fetchMonthlyTasks(currentDate, true);
            if (isMountedRef.current) {
              setTasks(monthTasks);
            }
          } finally {
            if (isMountedRef.current) {
              setRefreshing(false);
            }
          }
        }
      } else {
        // No cache, fetch with loading indicator
        setRefreshing(true);
        try {
          const monthTasks = await fetchMonthlyTasks(currentDate, true);
          if (isMountedRef.current) {
            setTasks(monthTasks);
          }
        } finally {
          if (isMountedRef.current) {
            setRefreshing(false);
          }
        }
      }
    };

    loadMonthData();
  }, [currentDate, initialLoading, fetchMonthlyTasks]);

  // Full refresh (after mutations)
  const refreshAllData = useCallback(async () => {
    invalidateCache();
    setRefreshing(true);
    
    try {
      const [monthTasks, staticData] = await Promise.all([
        fetchMonthlyTasks(currentDate, true),
        fetchStaticData(true),
      ]);
      
      if (isMountedRef.current) {
        setTasks(monthTasks);
        setTodaysTasks(staticData.todaysTasks);
        setOverdueTasks(staticData.overdueTasks);
        setStats(staticData.stats);
        setContacts(staticData.contacts);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to refresh calendar data:", error);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [currentDate, invalidateCache, fetchMonthlyTasks, fetchStaticData]);

  // Format time to HH:MM
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Previous month days
    const prevMonth = new Date(year, month, 0);
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    const dateStr = formatDate(date);
    return tasks.filter(task => task.due_date === dateStr);
  };

  // Navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
    setFocusMode("today");
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is selected
  const isSelected = (date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Handle task completion toggle (with optional rating/feedback for session logging)
  const handleToggleComplete = async (task, rating = null, feedback = null) => {
    try {
      const newStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
      const updates = { status: newStatus };
      if (newStatus === "COMPLETED" && rating != null) updates.session_rating = rating;
      if (newStatus === "COMPLETED" && feedback) updates.session_feedback = feedback;
      await updateTask(task.task_id, updates);
      refreshAllData();
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  // Handle overdue task resolution (with optional rating/feedback)
  const handleResolveOverdue = async (taskId, resolution, rating = null, feedback = null) => {
    try {
      await resolveOverdueTask(taskId, resolution, rating, feedback);
      refreshAllData();
    } catch (error) {
      console.error("Failed to resolve overdue task:", error);
    }
  };

  // Handle task delete
  const handleDeleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(taskId);
      // Refresh all data including stats when task is deleted
      refreshAllData();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // Calculate end time from start time + duration
  const calculateEndTime = useCallback((startTime, durationMinutes) => {
    if (!startTime) return null;
    try {
      // Parse HH:MM:SS or HH:MM format
      const timeParts = startTime.split(':');
      if (timeParts.length < 2) return null;
      
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      if (isNaN(hours) || isNaN(minutes)) return null;
      
      // Calculate total minutes
      const totalMinutes = hours * 60 + minutes + (durationMinutes || 30);
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      
      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    } catch {
      return null;
    }
  }, []);


  // Get display tasks based on focus mode
  const displayTasks = useMemo(() => {
    let filtered = [];
    
    if (focusMode === "today") {
      filtered = todaysTasks;
    } else if (focusMode === "week") {
      const todayStr = formatDate(new Date());
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = formatDate(weekEnd);
      filtered = tasks.filter((task) => {
        return task.due_date >= todayStr && task.due_date <= weekEndStr;
      });
    } else if (focusMode === "availabilities") {
      // Show today's tasks for availability view
      filtered = todaysTasks;
    } else {
      filtered = getTasksForDate(selectedDate);
    }

    if (filterType !== "ALL") {
      filtered = filtered.filter((task) => task.task_type === filterType);
    }

    return filtered.sort((a, b) => {
      if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
      if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1;
      if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
      return 0;
    });
  }, [focusMode, todaysTasks, tasks, selectedDate, filterType]);

  const days = getDaysInMonth(currentDate);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  // Only show full loading screen on initial load without cached data
  if (initialLoading && !stats) {
    return <CalendarSkeleton isAdmin={isAdmin} />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500">Manage your tasks, calls, and follow-ups</p>
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                • Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Background refresh indicator */}
          {isBackgroundRefresh && (
            <span className={`flex items-center gap-1.5 text-xs ${themeColors.textPrimary}`}>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Updating...
            </span>
          )}
          
          {/* Focus Mode Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFocusMode(null)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                focusMode === null ? themeColors.activeButton : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                focusMode === "today" ? themeColors.activeButton : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFocusMode("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                focusMode === "week" ? themeColors.activeButton : "text-gray-600 hover:text-gray-800"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setFocusMode("availabilities")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                focusMode === "availabilities" ? themeColors.activeButton : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Availabilities
            </button>
          </div>

          {/* Google Calendar Sync Button */}
          {gcalConnected && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
                isSyncing
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
              title="Sync all tasks to Google Calendar"
            >
              <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
              </svg>
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
          )}
          {gcalConnected === false && (
            <span className="text-xs text-gray-400 flex items-center gap-1" title="Connect your Gmail account in Settings to enable Google Calendar sync">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Calendar not linked
            </span>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${themeColors.primary} text-white rounded-lg ${themeColors.primaryHover} transition-all shadow-sm`}
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Today"
            value={stats.today_pending || 0}
            icon={<CalendarIcon className="w-5 h-5" />}
            color={isAdmin ? "orange" : "sky"}
          />
          <StatCard
            label="This Week"
            value={stats.this_week || 0}
            icon={<ListTodo className="w-5 h-5" />}
            color={isAdmin ? "amber" : "blue"}
          />
          <StatCard
            label="Overdue"
            value={stats.overdue || 0}
            icon={<AlertCircle className="w-5 h-5" />}
            color={stats.overdue > 0 ? "red" : "gray"}
            urgent={stats.overdue > 0}
          />
          <StatCard
            label="Completed"
            value={stats.completed || 0}
            icon={<CheckCircle className="w-5 h-5" />}
            color="emerald"
          />
        </div>
      )}

      {/* Google Calendar Sync Toast */}
      {syncResult && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
          syncResult.error
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {syncResult.error ? (
            <>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{syncResult.error}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Synced to Google Calendar — {syncResult.created || 0} created, {syncResult.updated || 0} updated
                {syncResult.failed > 0 && `, ${syncResult.failed} failed`}
              </span>
            </>
          )}
          <button onClick={() => setSyncResult(null)} className="ml-auto p-0.5 hover:bg-black/5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">{monthName}</h2>
              {refreshing && (
                <RefreshCw className={`w-4 h-4 ${themeColors.spinner} animate-spin`} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevMonth}
                disabled={refreshing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }}
                className={`px-3 py-1.5 text-sm ${themeColors.textPrimary} ${themeColors.bgHover} rounded-lg transition-colors`}
              >
                Today
              </button>
              <button
                onClick={goToNextMonth}
                disabled={refreshing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className={`grid grid-cols-7 gap-1 transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
            {days.map((day, index) => {
              const dayTasks = getTasksForDate(day.date);
              const hasOverdue = dayTasks.some((t) => t.status === "OVERDUE");
              const hasPending = dayTasks.some((t) => t.status === "PENDING" || t.status === "IN_PROGRESS");
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setFocusMode(null);
                  }}
                  className={`
                    relative p-2 min-h-[70px] rounded-lg text-left transition-all
                    ${day.isCurrentMonth ? "bg-white" : "bg-gray-50"}
                    ${isSelected(day.date) ? `ring-2 ${themeColors.ringColor} ${themeColors.bgLight}` : "hover:bg-gray-50"}
                    ${isToday(day.date) ? themeColors.bgLight : ""}
                  `}
                >
                  <span
                    className={`
                      text-sm font-medium
                      ${!day.isCurrentMonth ? "text-gray-400" : "text-gray-700"}
                      ${isToday(day.date) ? `${themeColors.textPrimary} font-bold` : ""}
                    `}
                  >
                    {day.date.getDate()}
                  </span>
                  
                  {/* Task Indicators */}
                  {dayTasks.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 2).map((task) => {
                        const config = TASK_TYPES[task.task_type] || TASK_TYPES.OTHER;
                        return (
                          <div
                            key={task.task_id}
                            className={`
                              text-xs truncate px-1 py-0.5 rounded
                              ${task.status === "COMPLETED" ? "line-through text-gray-400 bg-gray-100" : ""}
                              ${task.status === "OVERDUE" ? "bg-red-100 text-red-600" : `bg-${config.color}-100 text-${config.color}-600`}
                            `}
                          >
                            {task.title}
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && (
                        <span className="text-xs text-gray-400">+{dayTasks.length - 2} more</span>
                      )}
                    </div>
                  )}

                  {/* Status Dots */}
                  <div className="absolute bottom-1 right-1 flex gap-0.5">
                    {hasOverdue && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
                    {hasPending && <span className={`w-1.5 h-1.5 ${themeColors.dotColor} rounded-full`} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task List Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
          {/* Panel Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {focusMode === "today"
                ? "Today's Tasks"
                : focusMode === "week"
                ? "This Week"
                : focusMode === "availabilities"
                ? "Today's Availabilities"
                : selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </h3>
            
            {/* Filter Dropdown - Hidden in availabilities mode */}
            {focusMode !== "availabilities" && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 ${themeColors.focusRing}`}
              >
                <option value="ALL">All Types</option>
                {Object.entries(TASK_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* Overdue Warning */}
          {overdueTasks.length > 0 && focusMode !== "today" && focusMode !== "week" && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                {overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""}
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {displayTasks.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No tasks scheduled</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className={`mt-3 text-sm ${themeColors.textPrimary} ${themeColors.textHover}`}
                >
                  + Add a task
                </button>
              </div>
            ) : focusMode === "availabilities" ? (
              // Availability View - Visual timeline with busy slots
              <AvailabilityTimeline 
                tasks={displayTasks} 
                formatTime={formatTime}
                calculateEndTime={calculateEndTime}
                themeColors={themeColors}
              />
            ) : (
              displayTasks.map((task) => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onResolveOverdue={handleResolveOverdue}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                  isAdmin={isAdmin}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Task Modal */}
      {(showAddModal || editingTask) && (
        <TaskModal
          isOpen={showAddModal || !!editingTask}
          task={editingTask}
          contacts={contacts}
          selectedDate={selectedDate}
          onClose={() => {
            setShowAddModal(false);
            setEditingTask(null);
          }}
          onSave={async (taskData) => {
            try {
              if (editingTask) {
                await updateTask(editingTask.task_id, taskData);
              } else {
                await createTask(taskData);
              }
              // Refresh all data including stats when task is modified
              refreshAllData();
              setShowAddModal(false);
              setEditingTask(null);
            } catch (error) {
              console.error("Failed to save task:", error);
            }
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// AVAILABILITY TIMELINE - Visual representation of free/busy time slots
// =============================================================================
function AvailabilityTimeline({ tasks, formatTime, calculateEndTime, themeColors }) {
  // Working hours: 8 AM to 8 PM (12 hours)
  const START_HOUR = 8;
  const END_HOUR = 20;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  // Convert time string (HH:MM:SS or HH:MM) to minutes from midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  // Get busy time slots from tasks
  const busySlots = useMemo(() => {
    return tasks
      .filter(t => t.due_time && t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
      .map(task => {
        const startMinutes = timeToMinutes(task.due_time);
        const duration = task.duration_minutes || 30;
        const endMinutes = startMinutes + duration;
        return {
          ...task,
          startMinutes,
          endMinutes,
          startTime: task.due_time,
          endTime: calculateEndTime(task.due_time, duration),
        };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);
  }, [tasks, calculateEndTime]);

  // Calculate free slots
  const freeSlots = useMemo(() => {
    const slots = [];
    const workStartMinutes = START_HOUR * 60;
    const workEndMinutes = END_HOUR * 60;
    
    let currentTime = workStartMinutes;
    
    for (const busy of busySlots) {
      // If there's a gap before this busy slot
      if (busy.startMinutes > currentTime && busy.startMinutes >= workStartMinutes) {
        const gapStart = Math.max(currentTime, workStartMinutes);
        const gapEnd = Math.min(busy.startMinutes, workEndMinutes);
        if (gapEnd > gapStart) {
          slots.push({
            type: 'free',
            startMinutes: gapStart,
            endMinutes: gapEnd,
            duration: gapEnd - gapStart,
          });
        }
      }
      currentTime = Math.max(currentTime, busy.endMinutes);
    }
    
    // Add remaining free time after last busy slot
    if (currentTime < workEndMinutes) {
      slots.push({
        type: 'free',
        startMinutes: Math.max(currentTime, workStartMinutes),
        endMinutes: workEndMinutes,
        duration: workEndMinutes - Math.max(currentTime, workStartMinutes),
      });
    }
    
    return slots;
  }, [busySlots]);

  // Format minutes to time string
  const minutesToTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Calculate position and height for timeline items
  const getTimelineStyle = (startMinutes, endMinutes) => {
    const workStartMinutes = START_HOUR * 60;
    const totalMinutes = TOTAL_HOURS * 60;
    const top = ((startMinutes - workStartMinutes) / totalMinutes) * 100;
    const height = ((endMinutes - startMinutes) / totalMinutes) * 100;
    // Minimum height of 6% to ensure text is readable (approx 18px at 300px height)
    return { top: `${top}%`, height: `${Math.max(height, 6)}%` };
  };

  // Generate hour markers
  const hourMarkers = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    hourMarkers.push(h);
  }

  const totalBusyMinutes = busySlots.reduce((sum, s) => sum + (s.endMinutes - s.startMinutes), 0);
  const totalFreeMinutes = freeSlots.reduce((sum, s) => sum + s.duration, 0);
  const overdueTasks = tasks.filter(t => t.status === 'OVERDUE');

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {Math.floor(totalFreeMinutes / 60)}h {totalFreeMinutes % 60}m
          </div>
          <div className="text-xs text-emerald-600 font-medium">Available Today</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {busySlots.length}
          </div>
          <div className="text-xs text-purple-600 font-medium">Scheduled Tasks</div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{overdueTasks.length} overdue tasks</span>
        </div>
      )}

      {/* Visual Timeline */}
      <div className="relative bg-gray-50 rounded-xl p-4 border border-gray-200 overflow-hidden">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Today's Schedule
        </h4>
        
        <div className="flex gap-3">
          {/* Hour labels */}
          <div className="flex flex-col justify-between text-xs text-gray-400 py-1 flex-shrink-0" style={{ height: '300px' }}>
            {hourMarkers.map(h => (
              <span key={h} className="leading-none">
                {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
              </span>
            ))}
          </div>

          {/* Timeline bar */}
          <div className="flex-1 relative bg-emerald-100 rounded-lg" style={{ height: '300px' }}>
            {/* Hour grid lines */}
            {hourMarkers.slice(0, -1).map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-emerald-200/50"
                style={{ top: `${(i / TOTAL_HOURS) * 100}%` }}
              />
            ))}

            {/* Busy slots */}
            {busySlots.map((slot, index) => {
              const style = getTimelineStyle(slot.startMinutes, slot.endMinutes);
              const config = TASK_TYPES[slot.task_type] || TASK_TYPES.OTHER;
              const heightPercent = parseFloat(style.height);
              const isSmallBlock = heightPercent < 10;
              const topPercent = parseFloat(style.top);
              // Show tooltip below if task is in top half, above if in bottom half
              const showTooltipBelow = topPercent < 50;
              
              return (
                <div
                  key={slot.task_id || index}
                  className="absolute left-1 right-1 rounded-md cursor-pointer hover:ring-2 hover:ring-white/60 hover:shadow-md transition-all group z-[1] hover:z-[5]"
                  style={{
                    ...style,
                    backgroundColor: slot.status === 'OVERDUE' ? '#fecaca' : 
                      config.color === 'sky' ? '#bae6fd' :
                      config.color === 'purple' ? '#e9d5ff' :
                      config.color === 'amber' ? '#fde68a' :
                      config.color === 'rose' ? '#fecdd3' :
                      config.color === 'emerald' ? '#a7f3d0' : '#e5e7eb',
                  }}
                >
                  {/* Task content */}
                  <div className={`h-full flex flex-col justify-center px-2 py-0.5 overflow-hidden ${isSmallBlock ? 'py-0' : ''}`}>
                    <div className={`font-medium text-gray-800 truncate ${isSmallBlock ? 'text-[10px] leading-tight' : 'text-xs'}`}>
                      {slot.title}
                    </div>
                    {!isSmallBlock && (
                      <div className="text-[10px] text-gray-600 truncate">
                        {formatTime(slot.startTime)}
                      </div>
                    )}
                  </div>
                  
                  {/* Hover tooltip - positioned above or below based on position */}
                  <div className={`absolute left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none ${
                    showTooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                  }`}>
                    <div className="font-medium">{slot.title}</div>
                    <div className="text-gray-300 mt-0.5">
                      {formatTime(slot.startTime)} → {formatTime(slot.endTime)}
                    </div>
                    {slot.contact_name && (
                      <div className="text-gray-400 mt-0.5">📌 {slot.contact_name}</div>
                    )}
                    {/* Tooltip arrow */}
                    <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                      showTooltipBelow 
                        ? 'bottom-full border-b-gray-900' 
                        : 'top-full border-t-gray-900'
                    }`} />
                  </div>
                </div>
              );
            })}

            {/* Current time indicator */}
            {(() => {
              const now = new Date();
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const workStartMinutes = START_HOUR * 60;
              const workEndMinutes = END_HOUR * 60;
              
              if (currentMinutes >= workStartMinutes && currentMinutes <= workEndMinutes) {
                const position = ((currentMinutes - workStartMinutes) / (TOTAL_HOURS * 60)) * 100;
                return (
                  <div
                    className="absolute left-0 right-0 flex items-center z-10"
                    style={{ top: `${position}%` }}
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      {/* Free Slots List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          Available Time Slots
        </h4>
        
        {freeSlots.length === 0 ? (
          <div className="text-sm text-gray-500 py-3 text-center bg-gray-50 rounded-lg">
            No free slots available today
          </div>
        ) : (
          <div className="grid gap-2">
            {freeSlots.map((slot, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-emerald-900">
                      {minutesToTime(slot.startMinutes)} — {minutesToTime(slot.endMinutes)}
                    </div>
                    <div className="text-xs text-emerald-600">
                      {Math.floor(slot.duration / 60) > 0 && `${Math.floor(slot.duration / 60)}h `}
                      {slot.duration % 60 > 0 && `${slot.duration % 60}m`} available
                    </div>
                  </div>
                </div>
                <div className="px-2 py-1 bg-emerald-200 text-emerald-800 text-xs font-medium rounded-full">
                  FREE
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled Tasks Summary */}
      {busySlots.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5 text-purple-500" />
            Scheduled ({busySlots.length})
          </h4>
          <div className="space-y-2">
            {busySlots.map((task) => {
              const config = TASK_TYPES[task.task_type] || TASK_TYPES.OTHER;
              const Icon = config.icon;
              
              return (
                <div
                  key={task.task_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
                    task.status === 'OVERDUE'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-white border-purple-400'
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${
                    task.status === 'OVERDUE' ? 'bg-red-100' : `bg-purple-100`
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${
                      task.status === 'OVERDUE' ? 'text-red-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatTime(task.startTime)} → {formatTime(task.endTime)}</span>
                      {task.contact_name && (
                        <>
                          <span>•</span>
                          <span className="truncate">{task.contact_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    task.status === 'OVERDUE'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {task.status || 'PENDING'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SKELETON LOADER - Shows content structure while loading
// =============================================================================
function CalendarSkeleton({ isAdmin = false }) {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-40 bg-gray-100 rounded-lg" />
          <div className={`h-10 w-28 ${isAdmin ? 'bg-orange-200' : 'bg-gray-200'} rounded-lg`} />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg" />
              <div>
                <div className="h-6 w-12 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Skeleton */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-gray-100 rounded" />
              <div className="h-8 w-16 bg-gray-100 rounded" />
              <div className="h-8 w-8 bg-gray-100 rounded" />
            </div>
          </div>
          {/* Week days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-4 bg-gray-100 rounded mx-2" />
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Task Panel Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="h-8 w-24 bg-gray-100 rounded" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-1/2 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;