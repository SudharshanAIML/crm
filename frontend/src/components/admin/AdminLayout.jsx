import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../layout/Sidebar';
import { DashboardHeader, MobileSidebar, ErrorAlert } from '../dashboard';

/**
 * Admin Layout - Reuses the same structure as DashboardLayout
 * Provides sidebar with Team tab, header, and common functionality
 * Admins see the same interface as employees plus admin-specific sections
 */
const AdminLayout = memo(() => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [error, setError] = useState(null);

  // Derive active stage and view from URL for header display
  const getActiveState = useCallback(() => {
    const path = location.pathname;
    
    // Check admin routes
    if (path === '/admin/team') return { view: 'team', stage: null };
    if (path === '/admin/settings') return { view: 'settings', stage: null };
    
    // Check workspace views (admin prefixed)
    if (path === '/admin/analytics') return { view: 'analytics', stage: null };
    if (path === '/admin/calendar') return { view: 'calendar', stage: null };
    if (path === '/admin/gmail') return { view: 'gmail', stage: null };
    
    // Check admin sessions routes (/admin/sessions/:stage)
    const sessionsMatch = path.match(/^\/admin\/sessions\/([\w]+)$/);
    if (sessionsMatch) {
      const stageMap = {
        lead: 'LEAD',
        mql: 'MQL',
        sql: 'SQL',
        opportunity: 'OPPORTUNITY',
        customer: 'CUSTOMER',
        evangelist: 'EVANGELIST',
        dormant: 'DORMANT',
      };
      const stage = stageMap[sessionsMatch[1].toLowerCase()];
      if (stage) return { view: 'sessions', stage };
    }
    
    // Check admin contact stages (/admin/contacts/:stage)
    const stageMatch = path.match(/^\/admin\/contacts\/(\w+)$/);
    if (stageMatch) {
      const stageMap = {
        lead: 'LEAD',
        mql: 'MQL',
        sql: 'SQL',
        opportunity: 'OPPORTUNITY',
        customer: 'CUSTOMER',
        evangelist: 'EVANGELIST',
        dormant: 'DORMANT',
      };
      const stage = stageMap[stageMatch[1].toLowerCase()];
      if (stage) return { view: 'contacts', stage };
    }
    
    // Default
    return { view: 'contacts', stage: 'LEAD' };
  }, [location.pathname]);

  const { view: activeView, stage: activeStage } = getActiveState();

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

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleOpenMobileMenu = useCallback(() => {
    setMobileMenuOpen(true);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <div
        className={`hidden lg:block fixed left-0 top-0 h-screen z-30 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={handleToggleSidebar}
          isAdmin={true}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={handleCloseMobileMenu}
        isAdmin={true}
      />

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* Top Header */}
        <DashboardHeader
          user={user}
          logout={logout}
          activeView={activeView}
          activeStage={activeStage}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
          userMenuRef={userMenuRef}
          onMobileMenuOpen={handleOpenMobileMenu}
        />

        {/* Error Message */}
        <ErrorAlert error={error} onDismiss={clearError} />

        {/* Page Content - Rendered by nested routes */}
        <main className="p-4 lg:p-6">
          <Outlet context={{ setError, clearError }} />
        </main>
      </div>
    </div>
  );
});

AdminLayout.displayName = 'AdminLayout';

export default AdminLayout;
