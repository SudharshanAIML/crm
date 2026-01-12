import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { DashboardHeader, MobileSidebar, ErrorAlert } from '../dashboard';

/**
 * Shared layout for all dashboard pages
 * Provides sidebar, header, and common functionality
 */
const DashboardLayout = memo(() => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [error, setError] = useState(null);

  // Derive active stage and view from URL
  const getActiveState = useCallback(() => {
    const path = location.pathname;
    
    // Check workspace views first
    if (path === '/analytics') return { view: 'analytics', stage: null };
    if (path === '/calendar') return { view: 'calendar', stage: null };
    if (path === '/gmail') return { view: 'gmail', stage: null };
    
    // Check contact stages
    const stageMatch = path.match(/^\/contacts\/(\w+)$/);
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

  // Navigation handlers using URL routing
  const handleStageChange = useCallback((stage) => {
    const stagePath = stage.toLowerCase();
    navigate(`/contacts/${stagePath}`);
  }, [navigate]);

  const handleViewChange = useCallback((view) => {
    if (view === 'contacts') {
      // Navigate to current stage or default to lead
      navigate(`/contacts/${(activeStage || 'LEAD').toLowerCase()}`);
    } else {
      navigate(`/${view}`);
    }
  }, [navigate, activeStage]);

  const handleMobileStageChange = useCallback((stage) => {
    handleStageChange(stage);
    setMobileMenuOpen(false);
  }, [handleStageChange]);

  const handleMobileViewChange = useCallback((view) => {
    handleViewChange(view);
    setMobileMenuOpen(false);
  }, [handleViewChange]);

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

  // Get initials for avatar
  const getInitials = useCallback((name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
          activeStage={activeStage}
          onStageChange={handleStageChange}
          collapsed={sidebarCollapsed}
          onToggle={handleToggleSidebar}
          onViewChange={handleViewChange}
          activeView={activeView}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={handleCloseMobileMenu}
        activeStage={activeStage}
        onStageChange={handleMobileStageChange}
        onViewChange={handleMobileViewChange}
        activeView={activeView}
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
          getInitials={getInitials}
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

DashboardLayout.displayName = 'DashboardLayout';

export default DashboardLayout;
