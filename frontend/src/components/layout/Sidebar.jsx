import { useNavigate, useLocation } from 'react-router-dom';
import { memo, useCallback, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Target, 
  Crown, 
  Star, 
  Moon,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CalendarDays,
  Mail
} from 'lucide-react';

/**
 * Pipeline stage configuration
 */
const STAGES = [
  { 
    id: 'LEAD', 
    slug: 'lead',
    label: 'Lead', 
    icon: UserPlus, 
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    activeColor: 'bg-gray-600 text-white'
  },
  { 
    id: 'MQL', 
    slug: 'mql',
    label: 'MQL', 
    icon: Users, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    activeColor: 'bg-blue-600 text-white'
  },
  { 
    id: 'SQL', 
    slug: 'sql',
    label: 'SQL', 
    icon: UserCheck, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    activeColor: 'bg-purple-600 text-white'
  },
  { 
    id: 'OPPORTUNITY', 
    slug: 'opportunity',
    label: 'Opportunity', 
    icon: Target, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    activeColor: 'bg-yellow-600 text-white'
  },
  { 
    id: 'CUSTOMER', 
    slug: 'customer',
    label: 'Customer', 
    icon: Crown, 
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    activeColor: 'bg-green-600 text-white'
  },
  { 
    id: 'EVANGELIST', 
    slug: 'evangelist',
    label: 'Evangelist', 
    icon: Star, 
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    activeColor: 'bg-pink-600 text-white'
  },
  { 
    id: 'DORMANT', 
    slug: 'dormant',
    label: 'Dormant', 
    icon: Moon, 
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    activeColor: 'bg-slate-500 text-white'
  },
];

/**
 * Workspace navigation items
 */
const WORKSPACE_ITEMS = [
  { id: 'contacts', path: '/contacts/lead', icon: LayoutGrid, label: 'Contacts' },
  { id: 'gmail', path: '/gmail', icon: Mail, label: 'Gmail' },
  { id: 'calendar', path: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { id: 'analytics', path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

/**
 * Stage navigation button component
 */
const StageButton = memo(({ stage, isActive, collapsed, onClick }) => {
  const Icon = stage.icon;
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        isActive 
          ? stage.activeColor + ' shadow-sm' 
          : 'text-gray-600 hover:bg-gray-50'
      } ${collapsed ? 'justify-center px-2' : ''}`}
      title={collapsed ? stage.label : undefined}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : stage.color}`} />
      {!collapsed && (
        <span className="flex-1 text-left font-medium text-sm">{stage.label}</span>
      )}
    </button>
  );
});

StageButton.displayName = 'StageButton';

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
const Sidebar = memo(({ activeStage, onStageChange, collapsed, onToggle, onViewChange, activeView = 'contacts' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle stage click - navigate to route
  const handleStageClick = useCallback((stage) => {
    if (onStageChange) {
      onStageChange(stage.id);
    } else {
      navigate(`/contacts/${stage.slug}`);
    }
  }, [navigate, onStageChange]);

  // Handle workspace item click - navigate to route
  const handleWorkspaceClick = useCallback((item) => {
    if (onViewChange) {
      onViewChange(item.id);
    } else {
      navigate(item.path);
    }
  }, [navigate, onViewChange]);

  // Determine active state from URL if not provided via props
  const currentActiveView = useMemo(() => {
    if (activeView) return activeView;
    const path = location.pathname;
    if (path.startsWith('/contacts')) return 'contacts';
    if (path === '/gmail') return 'gmail';
    if (path === '/calendar') return 'calendar';
    if (path === '/analytics') return 'analytics';
    return 'contacts';
  }, [activeView, location.pathname]);

  return (
    <aside 
      className={`h-full bg-white border-r border-gray-200 shadow-sm flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Pipeline Header with Toggle Arrow */}
          <div className="flex items-center justify-between mb-3">
            {!collapsed && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Pipeline
              </h3>
            )}
            <button
              onClick={onToggle}
              className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? 'mx-auto' : ''}`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>

          {/* Pipeline Navigation */}
          <nav className="space-y-1">
            {STAGES.map((stage) => (
              <StageButton
                key={stage.id}
                stage={stage}
                isActive={activeStage === stage.id}
                collapsed={collapsed}
                onClick={() => handleStageClick(stage)}
              />
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className={`border-t border-gray-100 my-2 ${collapsed ? 'mx-2' : 'mx-4'}`} />

        {/* Workspace Section */}
        <div className="p-4">
          {!collapsed && (
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Workspace
            </h3>
          )}
          <nav className="space-y-1">
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