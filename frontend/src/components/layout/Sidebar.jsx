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
  CalendarDays
} from 'lucide-react';

const Sidebar = ({ activeStage, onStageChange, contactCounts = {}, collapsed, onToggle, onViewChange, activeView = 'contacts' }) => {
  const stages = [
    { 
      id: 'LEAD', 
      label: 'Lead', 
      icon: UserPlus, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      activeColor: 'bg-gray-600 text-white'
    },
    { 
      id: 'MQL', 
      label: 'MQL', 
      icon: Users, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      activeColor: 'bg-blue-600 text-white'
    },
    { 
      id: 'SQL', 
      label: 'SQL', 
      icon: UserCheck, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      activeColor: 'bg-purple-600 text-white'
    },
    { 
      id: 'OPPORTUNITY', 
      label: 'Opportunity', 
      icon: Target, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      activeColor: 'bg-yellow-600 text-white'
    },
    { 
      id: 'CUSTOMER', 
      label: 'Customer', 
      icon: Crown, 
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      activeColor: 'bg-green-600 text-white'
    },
    { 
      id: 'EVANGELIST', 
      label: 'Evangelist', 
      icon: Star, 
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      activeColor: 'bg-pink-600 text-white'
    },
    { 
      id: 'DORMANT', 
      label: 'Dormant', 
      icon: Moon, 
      color: 'text-slate-500',
      bgColor: 'bg-slate-100',
      activeColor: 'bg-slate-500 text-white'
    },
  ];

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
            {stages.map((stage) => {
              const Icon = stage.icon;
              const isActive = activeStage === stage.id;
              const count = contactCounts[stage.id] || 0;
              
              return (
                <button
                  key={stage.id}
                  onClick={() => onStageChange(stage.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive 
                      ? stage.activeColor + ' shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? stage.label : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : stage.color}`} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left font-medium text-sm">{stage.label}</span>
                      {count > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-white/20' : stage.bgColor + ' ' + stage.color
                        }`}>
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Divider */}
        <div className={`border-t border-gray-100 my-2 ${collapsed ? 'mx-2' : 'mx-4'}`}></div>

        {/* Insights Section */}
        <div className="p-4">
          {!collapsed && (
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Workspace
            </h3>
          )}
          <nav className="space-y-1">
            <button
              onClick={() => onViewChange && onViewChange('contacts')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeView === 'contacts'
                  ? 'bg-sky-100 text-sky-700'
                  : 'text-gray-600 hover:bg-gray-50'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title="Contacts"
            >
              <LayoutGrid className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Contacts</span>}
            </button>
            <button
              onClick={() => onViewChange && onViewChange('calendar')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeView === 'calendar'
                  ? 'bg-sky-100 text-sky-700'
                  : 'text-gray-600 hover:bg-gray-50'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title="Calendar"
            >
              <CalendarDays className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Calendar</span>}
            </button>
            <button
              onClick={() => onViewChange && onViewChange('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeView === 'analytics'
                  ? 'bg-sky-100 text-sky-700'
                  : 'text-gray-600 hover:bg-gray-50'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title="Analytics"
            >
              <BarChart3 className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Analytics</span>}
            </button>
            <button
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ${
                collapsed ? 'justify-center px-2' : ''
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Settings</span>}
            </button>
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;