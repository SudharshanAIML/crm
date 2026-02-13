import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Bell, Menu, ChevronDown, Search, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import Profile from '../layout/Profile';
import GlobalSearch from '../layout/GlobalSearch';
import { getInitials, getPageTitle } from './utils/dashboardHelpers';
import { getTodaysTasks } from '../../services/taskService';

/**
 * Mobile Search Modal
 */
const MobileSearchModal = memo(({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Search Panel */}
      <div className="absolute top-0 left-0 right-0 bg-white p-4 shadow-xl">
        <GlobalSearch className="w-full" />
        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
});

MobileSearchModal.displayName = 'MobileSearchModal';

/**
 * Notification bell component with today's tasks
 */
const NotificationBell = memo(() => {
  const [tasks, setTasks] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);

  // Fetch today's tasks
  const fetchTodaysTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTodaysTasks();
      setTasks(Array.isArray(data) ? data : data?.tasks || []);
    } catch (error) {
      console.error('Failed to fetch today\'s tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tasks on mount and set hourly interval
  useEffect(() => {
    fetchTodaysTasks();
    const interval = setInterval(fetchTodaysTasks, 60 * 60 * 1000); // Hourly
    return () => clearInterval(interval);
  }, [fetchTodaysTasks]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const taskCount = tasks.length;
  const pendingCount = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;

  const getTaskIcon = (taskType) => {
    switch (taskType?.toUpperCase()) {
      case 'APPOINTMENT':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'CALL':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'FOLLOW_UP':
      case 'FOLLOWUP':
        return <AlertCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      // Handle HH:MM:SS or HH:MM format from database
      const timeParts = timeStr.split(':');
      if (timeParts.length < 2) return '';
      
      let hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      // Validate parsed values
      if (isNaN(hours) || isNaN(minutes)) return '';
      
      const meridiem = hours >= 12 ? 'PM' : 'AM';
      
      // Convert to 12-hour format
      hours = hours % 12 || 12;
      
      const minutesStr = String(minutes).padStart(2, '0');
      return `${hours}:${minutesStr} ${meridiem}`;
    } catch (error) {
      console.error('Error formatting time:', error, timeStr);
      return '';
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
        aria-label="View today's tasks"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {pendingCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">Today's Tasks</h3>
              <p className="text-xs text-gray-500">{taskCount} task{taskCount !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Tasks List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No tasks for today</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 hover:bg-gray-50 transition-colors ${
                      task.status === 'COMPLETED' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getTaskIcon(task.task_type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        {task.contact_name && (
                          <p className="text-xs text-gray-500 truncate">📌 {task.contact_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {task.due_time && (
                            <span className="text-xs text-gray-500">{formatTime(task.due_time)}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : task.status === 'CANCELLED'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {task.status || 'PENDING'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {tasks.length > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all tasks in calendar →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

NotificationBell.displayName = 'NotificationBell';

/**
 * User menu button component
 */
const UserMenuButton = memo(({ user, isOpen, onClick, isAdmin }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg py-1.5 pr-2 transition-colors"
  >
    <div className="hidden sm:block text-right">
      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
      <p className="text-xs text-gray-500">{user?.department || user?.role}</p>
    </div>
    <div className="relative">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm ${
        isAdmin 
          ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
          : 'bg-gradient-to-br from-sky-400 to-blue-600'
      }`}>
        {getInitials(user?.name)}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
    </div>
    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
  </button>
));

UserMenuButton.displayName = 'UserMenuButton';

/**
 * Dashboard header component
 * Contains page title, notifications, and user menu
 */
const DashboardHeader = memo(({
  activeView,
  activeStage,
  user,
  logout,
  onMobileMenuOpen,
  isAdmin = false,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const userMenuRef = useRef(null);
  
  // Theme colors based on admin status
  const headerBorderColor = isAdmin ? 'border-orange-100' : 'border-gray-100';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleUserMenu = useCallback(() => {
    setUserMenuOpen(prev => !prev);
  }, []);

  const openMobileSearch = useCallback(() => {
    setMobileSearchOpen(true);
  }, []);

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false);
  }, []);

  return (
    <>
    <MobileSearchModal isOpen={mobileSearchOpen} onClose={closeMobileSearch} />
    <header className={`sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b ${headerBorderColor}`}>
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Left - Mobile Menu & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMobileMenuOpen}
            className={`lg:hidden p-2 rounded-lg ${isAdmin ? 'hover:bg-orange-50' : 'hover:bg-gray-100'}`}
            aria-label="Open mobile menu"
          >
            <Menu className={`w-5 h-5 ${isAdmin ? 'text-orange-600' : 'text-gray-600'}`} />
          </button>

          {/* Page Title - Desktop */}
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-gray-900">
              {getPageTitle(activeView, activeStage)}
            </h1>
          </div>
        </div>

        {/* Center - Global Search (Desktop) */}
        <div className="hidden sm:block flex-1 max-w-md mx-4 lg:mx-8">
          <GlobalSearch />
        </div>

        {/* Right - Search (Mobile), Notifications & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Button */}
          <button
            onClick={openMobileSearch}
            className="sm:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Search contacts"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>

          <NotificationBell />

          {/* User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <UserMenuButton
              user={user}
              isOpen={userMenuOpen}
              onClick={toggleUserMenu}
              isAdmin={isAdmin}
            />

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <Profile 
                user={user}
                logout={logout}
                setUserMenuOpen={setUserMenuOpen}
              />
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;
