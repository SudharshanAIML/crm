import { memo } from 'react';
import {
  X, Mail, Phone, Activity, Star, Shield, ShieldCheck,
  CheckCircle2, Clock, Ban, Send, UserCheck, UserX,
  Trash2, RefreshCw
} from 'lucide-react';
import { getStatusIcon } from './index';

/**
 * Utility function to get initials from name
 */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
};

/**
 * Utility function to format time ago
 */
const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

/**
 * EmployeeDetailPanel - Slide-out panel showing employee details and actions
 * Includes profile, stats, contact info, admin actions, and recent activities
 */
const EmployeeDetailPanel = memo(({
  employee,
  activities = [],
  activitiesLoading,
  actionLoading,
  inviteLoading,
  user,
  onClose,
  onRoleChange,
  onResendInvitation,
  onToggleStatus,
  onDelete,
  formatCompact
}) => {
  if (!employee) return null;

  const employeeActivities = activities || [];

  const isCurrentUser = employee.emp_id === user?.emp_id;
  const isDisabled = employee.invitation_status === 'DISABLED';
  const isActive = employee.invitation_status === 'ACTIVE';
  const isInvited = employee.invitation_status === 'INVITED';
  const isAdmin = employee.role === 'ADMIN';

  // Determine header gradient based on status/role
  const headerGradient = isDisabled
    ? 'bg-gradient-to-r from-gray-500 to-gray-600'
    : isAdmin
      ? 'bg-gradient-to-r from-amber-500 to-orange-600'
      : 'bg-gradient-to-r from-sky-500 to-blue-600';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Employee Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header */}
          <div className={`px-6 py-8 ${headerGradient}`}>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/30">
                {getInitials(employee.name)}
              </div>
              <div className="text-white">
                <h3 className="text-xl font-bold">{employee.name}</h3>
                <p className="text-white/80">{employee.department || 'No department'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <RoleBadge role={employee.role} />
                  <StatusBadge status={employee.invitation_status} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-100">
            <StatItem 
              value={employee.contactsHandled || 0} 
              label="Leads" 
            />
            <StatItem 
              value={employee.dealsClosed || 0} 
              label="Deals" 
              className="text-emerald-600" 
            />
            <StatItem 
              value={formatCompact(employee.totalRevenue || 0)} 
              label="Revenue" 
              className="text-amber-600" 
            />
          </div>

          {/* Contact Info */}
          <div className="p-6 border-b border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Contact Information
            </h4>
            <div className="space-y-3">
              <ContactInfoItem icon={Mail} value={employee.email} />
              {employee.phone && (
                <ContactInfoItem icon={Phone} value={employee.phone} />
              )}
            </div>
          </div>

          {/* Admin Actions */}
          <div className="p-6 border-b border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Admin Actions
            </h4>
            <div className="flex flex-col gap-3">
              {/* Role Change - Only for ACTIVE employees */}
              {isActive && (
                <div className="flex gap-3">
                  {!isAdmin ? (
                    <ActionButton
                      onClick={() => onRoleChange(employee.emp_id, 'ADMIN')}
                      disabled={actionLoading}
                      variant="amber"
                      icon={ShieldCheck}
                      label="Promote to Admin"
                    />
                  ) : (
                    <ActionButton
                      onClick={() => onRoleChange(employee.emp_id, 'EMPLOYEE')}
                      disabled={actionLoading || isCurrentUser}
                      variant="sky"
                      icon={Shield}
                      label="Demote to Employee"
                    />
                  )}
                </div>
              )}

              {/* Resend Invitation - Only for INVITED */}
              {isInvited && (
                <ActionButton
                  onClick={() => onResendInvitation(employee.emp_id)}
                  disabled={inviteLoading === employee.emp_id}
                  variant="sky"
                  icon={inviteLoading === employee.emp_id ? RefreshCw : Send}
                  iconClassName={inviteLoading === employee.emp_id ? 'animate-spin' : ''}
                  label={inviteLoading === employee.emp_id ? 'Sending...' : 'Resend Invitation'}
                  fullWidth
                />
              )}

              {/* Enable/Disable + Remove */}
              {!isCurrentUser && (
                <div className="flex gap-3">
                  {isDisabled ? (
                    <ActionButton
                      onClick={() => onToggleStatus(employee.emp_id, 'DISABLED')}
                      disabled={actionLoading}
                      variant="emerald"
                      icon={UserCheck}
                      label="Enable Account"
                    />
                  ) : isActive ? (
                    <ActionButton
                      onClick={() => onToggleStatus(employee.emp_id, 'ACTIVE')}
                      disabled={actionLoading}
                      variant="amber"
                      icon={UserX}
                      label="Disable Account"
                    />
                  ) : null}
                  <button
                    onClick={() => onDelete(employee)}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="p-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Recent Activities
            </h4>

            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500" />
              </div>
            ) : employeeActivities.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent activities</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employeeActivities.slice(0, 10).map((activity, index) => (
                  <ActivityItem 
                    key={index} 
                    activity={activity} 
                    formatTimeAgo={formatTimeAgo} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animation Style */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
});

// Sub-components
const RoleBadge = memo(({ role }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/20 text-white">
    {role === 'ADMIN' ? (
      <ShieldCheck className="w-3.5 h-3.5" />
    ) : (
      <Shield className="w-3.5 h-3.5" />
    )}
    {role}
  </span>
));

const StatusBadge = memo(({ status }) => {
  const config = {
    ACTIVE: { icon: CheckCircle2, className: 'bg-emerald-500/30' },
    DISABLED: { icon: Ban, className: 'bg-red-500/30' },
    INVITED: { icon: Clock, className: 'bg-amber-500/30' }
  };
  const { icon: Icon, className } = config[status] || config.INVITED;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {status || 'Pending'}
    </span>
  );
});

const StatItem = memo(({ value, label, className = 'text-gray-900' }) => (
  <div className="text-center">
    <p className={`text-2xl font-bold ${className}`}>{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
));

const ContactInfoItem = memo(({ icon: Icon, value }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
    <Icon className="w-5 h-5 text-gray-400" />
    <span className="text-sm text-gray-700">{value}</span>
  </div>
));

const ActionButton = memo(({ 
  onClick, 
  disabled, 
  variant, 
  icon: Icon, 
  iconClassName = '',
  label, 
  fullWidth = false 
}) => {
  const variants = {
    sky: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? 'w-full' : 'flex-1'} inline-flex items-center justify-center gap-2 px-4 py-2.5 ${variants[variant]} rounded-xl font-medium text-sm transition-colors disabled:opacity-50`}
    >
      <Icon className={`w-4 h-4 ${iconClassName}`} />
      {label}
    </button>
  );
});

const ActivityItem = memo(({ activity, formatTimeAgo }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
    <div className="mt-0.5">
      {getStatusIcon(activity.session_status)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">
        {activity.contact_name || 'Unknown Contact'}
      </p>
      <p className="text-xs text-gray-500">
        {activity.mode_of_contact} • {formatTimeAgo(activity.created_at)}
      </p>
      {activity.remarks && (
        <p className="text-xs text-gray-600 mt-1 bg-white rounded p-2">
          {activity.remarks}
        </p>
      )}
    </div>
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <span className="text-xs font-medium text-gray-600">{activity.rating}/10</span>
    </div>
  </div>
));

// Display names for debugging
EmployeeDetailPanel.displayName = 'EmployeeDetailPanel';
RoleBadge.displayName = 'RoleBadge';
StatusBadge.displayName = 'StatusBadge';
StatItem.displayName = 'StatItem';
ContactInfoItem.displayName = 'ContactInfoItem';
ActionButton.displayName = 'ActionButton';
ActivityItem.displayName = 'ActivityItem';

export default EmployeeDetailPanel;
