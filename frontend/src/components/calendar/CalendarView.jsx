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
              // Availability View - Show time slots with start/end times
              displayTasks.map((task) => {
                const startTime = task.due_time;
                const endTime = calculateEndTime(startTime, task.duration_minutes || 30);
                const config = TASK_TYPES[task.task_type] || TASK_TYPES.OTHER;
                const Icon = config.icon;

                return (
                  <div
                    key={task.task_id}
                    className={`p-4 rounded-lg border-l-4 ${
                      task.status === 'COMPLETED'
                        ? 'bg-gray-50 border-gray-300 opacity-60'
                        : task.status === 'CANCELLED'
                        ? 'bg-gray-50 border-gray-400'
                        : `bg-${config.color}-50 border-${config.color}-500`
                    } transition-all hover:shadow-sm`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${
                          task.status === 'COMPLETED' || task.status === 'CANCELLED'
                            ? 'bg-gray-200'
                            : `bg-${config.color}-100`
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            task.status === 'COMPLETED' || task.status === 'CANCELLED'
                              ? 'text-gray-500'
                              : `text-${config.color}-600`
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-gray-900 truncate ${
                            task.status === 'COMPLETED' ? 'line-through' : ''
                          }`}>
                            {task.title}
                          </h4>
                          
                          {task.contact_name && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">
                              📌 {task.contact_name}
                            </p>
                          )}
                          
                          {/* Time Range */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">
                                {formatTime(startTime)}
                              </span>
                            </div>
                            
                            <span className="text-gray-400">→</span>
                            
                            {endTime && (
                              <span className="text-sm font-medium text-gray-700">
                                {formatTime(endTime)}
                              </span>
                            )}
                            
                            <span className="text-xs text-gray-500 ml-1">
                              ({task.duration_minutes || 30} min)
                            </span>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                              task.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : task.status === 'CANCELLED'
                                ? 'bg-gray-100 text-gray-700'
                                : task.status === 'OVERDUE'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {task.status || 'PENDING'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
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