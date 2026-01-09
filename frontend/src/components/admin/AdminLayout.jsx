import { memo, useRef, useEffect, useState, Suspense } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Building2, Users, Contact, BarChart3, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Profile } from '../layout';

/**
 * Navigation tab configuration
 */
const TABS = [
  { id: 'team', path: '/admin/team', label: 'Team', icon: Users },
  { id: 'contacts', path: '/admin/contacts', label: 'Contacts', icon: Contact },
  { id: 'analytics', path: '/admin/analytics', label: 'Analytics', icon: BarChart3 }
];

/**
 * TabLink - Navigation link with active state styling
 */
const TabLink = memo(({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
        isActive
          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`
    }
  >
    <Icon className="w-4 h-4" />
    {label}
  </NavLink>
));
TabLink.displayName = 'TabLink';

/**
 * MobileTabLink - Mobile navigation link
 */
const MobileTabLink = memo(({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
        isActive
          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`
    }
  >
    <Icon className="w-4 h-4" />
    {label}
  </NavLink>
));
MobileTabLink.displayName = 'MobileTabLink';

/**
 * Get initials from name
 */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length >= 2 
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() 
    : name.substring(0, 2).toUpperCase();
};

/**
 * Loading fallback component
 */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
  </div>
);

/**
 * AdminLayout - Main layout wrapper for admin pages
 * Uses React Router's Outlet for nested routes
 */
const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage your team & monitor performance</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2 ml-auto mr-6">
              {TABS.map(tab => (
                <TabLink
                  key={tab.id}
                  to={tab.path}
                  icon={tab.icon}
                  label={tab.label}
                />
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 hover:bg-gray-50 rounded-lg py-1.5 px-2 transition-colors"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.department || user?.role}</p>
                  </div>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {getInitials(user?.name)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

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

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2 pb-3 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <MobileTabLink
                key={tab.id}
                to={tab.path}
                icon={tab.icon}
                label={tab.label}
              />
            ))}
          </div>

          {/* Full-width divider */}
          <div className="border-b border-gray-200 -mx-6" />
        </div>
      </header>

      {/* Page Content with Suspense for lazy loading */}
      <main className="p-6">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AdminLayout;
