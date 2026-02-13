import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Bell, Menu, ChevronDown, Search, Check, CheckCheck, X, Calendar, UserPlus, Trophy, AlertCircle, Clock, Settings } from 'lucide-react';
import Profile from '../layout/Profile';
import GlobalSearch from '../layout/GlobalSearch';
import { getInitials, getPageTitle } from './utils/dashboardHelpers';
import notificationService from '../../services/notificationService';
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
 * Get icon for notification type
 */
const getNotificationIcon = (type) => {
  const iconProps = { className: "w-4 h-4" };
  switch (type) {
    case 'TASK_DUE_SOON':
    case 'TASK_OVERDUE':
      return <Clock {...iconProps} className="w-4 h-4 text-orange-500" />;
    case 'TASK_ASSIGNED':
      return <Check {...iconProps} className="w-4 h-4 text-blue-500" />;
    case 'APPOINTMENT_ACCEPTED':
      return <Calendar {...iconProps} className="w-4 h-4 text-green-500" />;
    case 'APPOINTMENT_RESCHEDULE':
      return <Calendar {...iconProps} className="w-4 h-4 text-yellow-500" />;
    case 'APPOINTMENT_CANCELLED':
      return <Calendar {...iconProps} className="w-4 h-4 text-red-500" />;
    case 'NEW_CONTACT':
      return <UserPlus {...iconProps} className="w-4 h-4 text-purple-500" />;
    case 'DEAL_WON':
      return <Trophy {...iconProps} className="w-4 h-4 text-green-500" />;
    case 'DEAL_LOST':
      return <AlertCircle {...iconProps} className="w-4 h-4 text-red-500" />;
    default:
      return <Settings {...iconProps} className="w-4 h-4 text-gray-500" />;
  }
};

/**
 * Format relative time
 */
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Single notification item
 */
const NotificationItem = memo(({ notification, onMarkAsRead, onArchive }) => {
  const handleClick = useCallback(() => {
    if (!notification.is_read) {
      onMarkAsRead(notification.notification_id);
    }
  }, [notification, onMarkAsRead]);

  const handleArchive = useCallback((e) => {
    e.stopPropagation();
    onArchive(notification.notification_id);
  }, [notification, onArchive]);

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
        notification.is_read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/50 hover:bg-blue-50'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5 p-1.5 bg-gray-100 rounded-lg">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
      <button
        onClick={handleArchive}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

NotificationItem.displayName = 'NotificationItem';

/**
 * Notification bell component with dropdown
 */
const NotificationBell = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch unread count periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  // Fetch notifications when opening dropdown
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications({ limit: 15 });
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  const handleArchive = useCallback(async (notificationId) => {
    try {
      await notificationService.archiveNotification(notificationId);
      const archived = notifications.find(n => n.notification_id === notificationId);
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
      if (archived && !archived.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to archive notification:', err);
    }
  }, [notifications]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-semibold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="w-8 h-8 mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationItem
                  key={notification.notification_id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onArchive={handleArchive}
                />
              ))
            )}
          </div>
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
