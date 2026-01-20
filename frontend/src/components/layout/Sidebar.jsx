import { useNavigate, useLocation } from 'react-router-dom';
import { memo, useCallback, useMemo, useState } from 'react';
import { 
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  CalendarDays,
  Mail,
  MessageSquare,
  UserPlus,
  Users,
  UserCheck,
  Target,
  Crown,
  Star,
  Moon
} from 'lucide-react';

/**
 * Pipeline stages configuration
 */
const PIPELINE_STAGES = [
  { id: 'LEAD', slug: 'lead', label: 'Lead', icon: UserPlus, color: 'text-gray-600', bgColor: 'bg-gray-100', activeColor: 'bg-gray-600' },
  { id: 'MQL', slug: 'mql', label: 'MQL', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100', activeColor: 'bg-blue-600' },
  { id: 'SQL', slug: 'sql', label: 'SQL', icon: UserCheck, color: 'text-purple-600', bgColor: 'bg-purple-100', activeColor: 'bg-purple-600' },
  { id: 'OPPORTUNITY', slug: 'opportunity', label: 'Opportunity', icon: Target, color: 'text-amber-600', bgColor: 'bg-amber-100', activeColor: 'bg-amber-600' },
  { id: 'CUSTOMER', slug: 'customer', label: 'Customer', icon: Crown, color: 'text-green-600', bgColor: 'bg-green-100', activeColor: 'bg-green-600' },
  { id: 'EVANGELIST', slug: 'evangelist', label: 'Evangelist', icon: Star, color: 'text-pink-600', bgColor: 'bg-pink-100', activeColor: 'bg-pink-600' },
  { id: 'DORMANT', slug: 'dormant', label: 'Dormant', icon: Moon, color: 'text-slate-500', bgColor: 'bg-slate-100', activeColor: 'bg-slate-500' },
];

/**
 * Workspace navigation items (without contacts/sessions - handled separately)
 */
const WORKSPACE_ITEMS = [
  { id: 'gmail', path: '/gmail', icon: Mail, label: 'Gmail' },
  { id: 'calendar', path: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { id: 'analytics', path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

/**
 * Workspace navigation button component
 */
const WorkspaceButton = memo(({ item, isActive, collapsed, onClick }) => {
  const Icon = item.icon;
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        isActive
          ? 'bg-sky-100 text-sky-700'
          : 'text-gray-600 hover:bg-gray-50'
      } ${collapsed ? 'justify-center px-2' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
    </button>
  );
});

WorkspaceButton.displayName = 'WorkspaceButton';

/**
 * Main Sidebar component
 */
const Sidebar = memo(({ collapsed, onToggle, onViewChange, activeView = 'contacts' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isContactsExpanded, setIsContactsExpanded] = useState(true);
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);

  // Get current stage from URL for contacts
  const currentContactStage = useMemo(() => {
    const match = location.pathname.match(/^\/contacts\/(\w+)/);
    if (match) {
      const stage = PIPELINE_STAGES.find(s => s.slug === match[1].toLowerCase());
      return stage?.id || 'LEAD';
    }
    return 'LEAD';
  }, [location.pathname]);

  // Get current stage from URL for sessions
  const currentSessionStage = useMemo(() => {
    const match = location.pathname.match(/^\/(\w+)\/followups$/);
    if (match) {
      const stage = PIPELINE_STAGES.find(s => s.slug === match[1].toLowerCase());
      return stage?.id || null;
    }
    return null;
  }, [location.pathname]);

  // Handle workspace item click - navigate to route
  const handleWorkspaceClick = useCallback((item) => {
    if (onViewChange) {
      onViewChange(item.id);
    } else {
      navigate(item.path);
    }
  }, [navigate, onViewChange]);

  // Handle contact stage click
  const handleContactStageClick = useCallback((stage) => {
    navigate(`/contacts/${stage.slug}`);
  }, [navigate]);

  // Handle session stage click
  const handleSessionStageClick = useCallback((stage) => {
    navigate(`/${stage.slug}/followups`);
  }, [navigate]);

  // Determine active state from URL if not provided via props
  const currentActiveView = useMemo(() => {
    if (activeView) return activeView;
    const path = location.pathname;
    if (path.startsWith('/contacts')) return 'contacts';
    if (path.match(/^\/\w+\/followups$/)) return 'sessions';
    if (path === '/gmail') return 'gmail';
    if (path === '/calendar') return 'calendar';
    if (path === '/analytics') return 'analytics';
    return 'contacts';
  }, [activeView, location.pathname]);

  return (
    <aside 
      className={`h-full bg-white border-r border-gray-200 shadow-sm flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Toggle Button */}
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={onToggle}
          className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? 'mx-auto block' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Workspace Section */}
        <div className="p-4">
          {!collapsed && (
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Workspace
            </h3>
          )}
          <nav className="space-y-1">
            {/* Contacts with Pipeline Dropdown */}
            <div>
              <button
                onClick={() => {
                  if (collapsed) {
                    navigate('/contacts/lead');
                  } else {
                    setIsContactsExpanded(!isContactsExpanded);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  currentActiveView === 'contacts'
                    ? 'bg-sky-100 text-sky-700'
                    : 'text-gray-600 hover:bg-gray-50'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? 'Contacts' : undefined}
              >
                <LayoutGrid className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium text-sm flex-1 text-left">Contacts</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isContactsExpanded ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              {/* Contacts Pipeline Stages Dropdown */}
              {!collapsed && isContactsExpanded && (
                <div className="mt-1 ml-2 pl-4 border-l-2 border-gray-100 space-y-0.5">
                  {PIPELINE_STAGES.map((stage) => {
                    const StageIcon = stage.icon;
                    const isActive = currentContactStage === stage.id && currentActiveView === 'contacts';
                    return (
                      <button
                        key={stage.id}
                        onClick={() => handleContactStageClick(stage)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm ${
                          isActive 
                            ? 'bg-sky-50 text-sky-700 font-medium' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md ${isActive ? 'bg-sky-100' : stage.bgColor} flex items-center justify-center`}>
                          <StageIcon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-600' : stage.color}`} />
                        </div>
                        <span>{stage.label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sessions with Pipeline Dropdown */}
            <div>
              <button
                onClick={() => {
                  if (collapsed) {
                    navigate('/lead/followups');
                  } else {
                    setIsSessionsExpanded(!isSessionsExpanded);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  currentActiveView === 'sessions'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? 'Sessions' : undefined}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="font-medium text-sm flex-1 text-left">Sessions</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isSessionsExpanded ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              {/* Sessions Pipeline Stages Dropdown */}
              {!collapsed && isSessionsExpanded && (
                <div className="mt-1 ml-2 pl-4 border-l-2 border-gray-100 space-y-0.5">
                  {PIPELINE_STAGES.map((stage) => {
                    const StageIcon = stage.icon;
                    const isActive = currentSessionStage === stage.id && currentActiveView === 'sessions';
                    return (
                      <button
                        key={stage.id}
                        onClick={() => handleSessionStageClick(stage)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm ${
                          isActive 
                            ? 'bg-purple-50 text-purple-700 font-medium' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md ${isActive ? 'bg-purple-100' : stage.bgColor} flex items-center justify-center`}>
                          <StageIcon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-600' : stage.color}`} />
                        </div>
                        <span>{stage.label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Other workspace items */}
            {WORKSPACE_ITEMS.map((item) => (
              <WorkspaceButton
                key={item.id}
                item={item}
                isActive={currentActiveView === item.id}
                collapsed={collapsed}
                onClick={() => handleWorkspaceClick(item)}
              />
            ))}
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ${
                collapsed ? 'justify-center px-2' : ''
              }`}
              title={collapsed ? 'Settings' : undefined}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Settings</span>}
            </button>
          </nav>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;