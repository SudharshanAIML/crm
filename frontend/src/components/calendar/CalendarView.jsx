import { useState, useEffect, useMemo } from "react";
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
} from "../../services/taskService";
import { getContacts } from "../../services/contactService";
import { StatCard, TaskCard, TaskModal } from '../calendar';
import { TASK_TYPES, PRIORITY_COLORS, STATUS_COLORS, toLocalDateOnly } from "./constants";


const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'today'
  const [focusMode, setFocusMode] = useState(null); // null, 'today', 'week'
  const [tasks, setTasks] = useState([]);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true); // Only for first load
  const [refreshing, setRefreshing] = useState(false); // For subsequent updates
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [filterType, setFilterType] = useState("ALL");

  // Format date to YYYY-MM-DD (local timezone) - defined early for use in fetchData
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch data
  const fetchData = async (isInitial = false) => {
    try {
      // Only show full loading on initial load
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      
      // Calculate date range for current view
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Fetch calendar tasks for current month - this is the main one that changes
      const calendarTasks = await getCalendarTasks(formatDate(start), formatDate(end));
      const normalizedTasks = calendarTasks.map(task => ({
        ...task,
        due_date: toLocalDateOnly(task.due_date), // 🔥 normalize ONCE
        }));
      setTasks(normalizedTasks);
      
      // Only fetch these on initial load or manual refresh (they don't change with month navigation)
      if (isInitial || !stats) {
        const [today, overdue, taskStats, contactList] = await Promise.all([
          getTodaysTasks(),
          getOverdueTasks(),
          getTaskStats(),
          getContacts({}).catch(() => []),
        ]);
        setTodaysTasks(today);
        setOverdueTasks(overdue);
        setStats(taskStats);
        setContacts(Array.isArray(contactList) ? contactList : []);
      }
    } catch (error) {
      console.error("Failed to fetch calendar data:", error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, []);

  // Month change - only fetch calendar tasks
  useEffect(() => {
    if (!initialLoading) {
      fetchData(false);
    }
  }, [currentDate]);

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

  // Handle task completion toggle
  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
      await updateTask(task.task_id, { status: newStatus });
      // Refresh all data including stats when status changes
      fetchData(true);
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  // Handle task delete
  const handleDeleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(taskId);
      // Refresh all data including stats when task is deleted
      fetchData(true);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

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

  // Only show full loading screen on initial load
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-gray-500">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
          <p className="text-gray-500 mt-1">Manage your tasks, calls, and follow-ups</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Focus Mode Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFocusMode(null)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                focusMode === null ? "bg-white text-sky-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                focusMode === "today" ? "bg-white text-sky-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFocusMode("week")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                focusMode === "week" ? "bg-white text-sky-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              This Week
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all shadow-sm"
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
            color="sky"
          />
          <StatCard
            label="This Week"
            value={stats.this_week || 0}
            icon={<ListTodo className="w-5 h-5" />}
            color="blue"
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">{monthName}</h2>
              {refreshing && (
                <RefreshCw className="w-4 h-4 text-sky-500 animate-spin" />
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
                className="px-3 py-1.5 text-sm text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
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
                    ${isSelected(day.date) ? "ring-2 ring-sky-500 bg-sky-50" : "hover:bg-gray-50"}
                    ${isToday(day.date) ? "bg-sky-50" : ""}
                  `}
                >
                  <span
                    className={`
                      text-sm font-medium
                      ${!day.isCurrentMonth ? "text-gray-400" : "text-gray-700"}
                      ${isToday(day.date) ? "text-sky-600 font-bold" : ""}
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
                    {hasPending && <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" />}
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
                : selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </h3>
            
            {/* Filter Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Types</option>
              {Object.entries(TASK_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
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
                  className="mt-3 text-sm text-sky-600 hover:text-sky-700"
                >
                  + Add a task
                </button>
              </div>
            ) : (
              displayTasks.map((task) => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
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
              fetchData(true);
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
export default CalendarView;