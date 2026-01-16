import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Bell, Menu, ChevronDown, Search } from 'lucide-react';
import Profile from '../layout/Profile';
import GlobalSearch from '../layout/GlobalSearch';
import { getInitials, getPageTitle } from './utils/dashboardHelpers';

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
 * Notification bell component
 */
const NotificationBell = memo(() => (
  <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
    <Bell className="w-5 h-5 text-gray-600" />
    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
  </button>
));

NotificationBell.displayName = 'NotificationBell';

/**
 * User menu button component
 */
const UserMenuButton = memo(({ user, isOpen, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg py-1.5 pr-2 transition-colors"
  >
    <div className="hidden sm:block text-right">
      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
      <p className="text-xs text-gray-500">{user?.department || user?.role}</p>
    </div>
    <div className="relative">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
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
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const userMenuRef = useRef(null);

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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Left - Mobile Menu & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMobileMenuOpen}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
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
