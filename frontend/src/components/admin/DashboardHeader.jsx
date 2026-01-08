import { memo, useRef, useEffect, useState } from 'react';
import { Building2, Users, Contact, BarChart3, ChevronDown } from 'lucide-react';
import { Profile } from '../layout';

/**
 * TabButton - Memoized navigation tab button
 */
const TabButton = memo(({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
      active
        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
));

TabButton.displayName = 'TabButton';

/**
 * MobileTabButton - Memoized mobile navigation tab button
 */
const MobileTabButton = memo(({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
      active
        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
));

MobileTabButton.displayName = 'MobileTabButton';

/**
 * Utility function to get initials from name
 */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * DashboardHeader - Main header with navigation tabs and user menu
 * Memoized to prevent unnecessary re-renders
 */
const DashboardHeader = memo(({ 
  activeTab, 
  setActiveTab, 
  user, 
  logout 
}) => {
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

  const tabs = [
    { id: 'team', label: 'Team', icon: Users },
    { id: 'contacts', label: 'Contacts', icon: Contact },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
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
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
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
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

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
        
        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2 pb-3 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <MobileTabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
              label={tab.label}
            />
          ))}
        </div>
        
        {/* Full-width divider */}
        <div className="border-b border-gray-200 -mx-6" />
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;
