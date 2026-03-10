import { memo } from 'react';
import { ArrowLeft, User, Link2, Bell, Shield, Sliders, LogOut, FileDown } from 'lucide-react';
import { getInitials, SETTINGS_TABS } from './utils/settingsHelpers';

/**
 * Icon mapping for dynamic icon rendering
 */
const ICONS = { User, Link2, Bell, Shield, Sliders, FileDown };

/**
 * Navigation tab item component
 */
const NavTab = memo(({ tab, isActive, onClick }) => {
  const Icon = ICONS[tab.icon];
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 mb-1 rounded-lg text-left transition-all ${
        isActive
          ? 'bg-sky-50 text-sky-700 border-l-4 border-sky-500 -ml-0.5'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : 'text-gray-400'}`} />
      <div>
        <p className={`font-medium text-sm ${isActive ? 'text-sky-700' : 'text-gray-700'}`}>
          {tab.label}
        </p>
        <p className="text-xs text-gray-500">{tab.description}</p>
      </div>
    </button>
  );
});

NavTab.displayName = 'NavTab';

/**
 * User info section at bottom of sidebar
 */
const UserInfo = memo(({ user, onLogout }) => (
  <div className="p-4 border-t border-gray-100">
    <div className="flex items-center gap-3 mb-4 p-2">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
        {getInitials(user?.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
      </div>
    </div>
    <button
      onClick={onLogout}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all"
    >
      <LogOut className="w-4 h-4" />
      <span className="font-medium text-sm">Sign Out</span>
    </button>
  </div>
));

UserInfo.displayName = 'UserInfo';

/**
 * Settings sidebar component
 * Contains navigation tabs and user info
 */
const SettingsSidebar = memo(({
  activeTab,
  onTabChange,
  onBack,
  backLabel,
  user,
  onLogout,
}) => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 h-screen z-40">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors w-full"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to {backLabel}</span>
        </button>
      </div>

      {/* Settings Title */}
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {SETTINGS_TABS.map((tab) => (
          <NavTab
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </nav>

      {/* User Info & Logout */}
      <UserInfo user={user} onLogout={onLogout} />
    </aside>
  );
});

SettingsSidebar.displayName = 'SettingsSidebar';

export default SettingsSidebar;
