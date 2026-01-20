import { memo } from 'react';
import { 
  Star, Clock, Calendar, Flame, Target, Activity, 
  Mail, Phone, Plus, ArrowRight, Building2, Moon 
} from 'lucide-react';
import {
  formatRating,
  formatDate,
  getInitials,
  getRelativeTime,
  getFutureTime,
  getTemperatureGradient,
  getTemperatureColors,
  getNextStage,
} from './utils/followupHelpers';

/**
 * Render star rating based on 0-10 scale
 */
const StarRating = memo(({ rating }) => {
  const stars = Math.round((rating / 10) * 5);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${
            star <= stars
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  );
});

StarRating.displayName = 'StarRating';

/**
 * Profile hero section with avatar and temperature badge
 */
const ProfileHero = memo(({ contact, averageRating }) => {
  const statusColors = {
    LEAD: 'bg-slate-100 text-slate-700',
    MQL: 'bg-blue-100 text-blue-700',
    SQL: 'bg-purple-100 text-purple-700',
    OPPORTUNITY: 'bg-amber-100 text-amber-700',
    CUSTOMER: 'bg-emerald-100 text-emerald-700',
    EVANGELIST: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="relative flex-shrink-0">
      {/* Gradient Header */}
      <div className={`h-24 ${getTemperatureGradient(contact?.temperature)}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
      </div>
      
      {/* Avatar */}
      <div className="absolute -bottom-12 left-5">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-xl">
            {getInitials(contact?.name)}
          </div>
          {/* Temperature Badge */}
          <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-white ${getTemperatureGradient(contact?.temperature)}`}>
            <Flame className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="absolute top-3 left-4">
        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
          statusColors[contact?.status] || 'bg-gray-100 text-gray-700'
        }`}>
          {contact?.status}
        </span>
      </div>
    </div>
  );
});

ProfileHero.displayName = 'ProfileHero';

/**
 * Profile info section with name, company, and rating
 */
const ProfileInfo = memo(({ contact, averageRating }) => (
  <div className="pt-14 px-5 pb-4 flex-shrink-0">
    <h3 className="text-xl font-bold text-gray-900">{contact?.name}</h3>
    {contact?.company && (
      <p className="text-gray-500 mt-1 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5" />
        {contact?.company}
      </p>
    )}

    {/* Rating */}
    <div className="flex items-center gap-3 mt-3">
      <StarRating rating={averageRating} />
      <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
        {formatRating(averageRating)}/10
      </span>
    </div>
  </div>
));

ProfileInfo.displayName = 'ProfileInfo';

/**
 * Contact timeline section (last contacted & next scheduled)
 */
const ContactTimeline = memo(({ lastContactedAt, nextUpcomingTask, onAddTask }) => (
  <div className="px-5 pb-4 flex-shrink-0">
    <div className="grid grid-cols-2 gap-3">
      {/* Last Contacted */}
      <div className="p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xs font-medium text-gray-500">Last Contact</span>
        </div>
        <p className="text-sm font-semibold text-gray-900">
          {lastContactedAt ? getRelativeTime(lastContactedAt) : 'Never'}
        </p>
        {lastContactedAt && (
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(lastContactedAt)}</p>
        )}
      </div>
      
      {/* Next Scheduled */}
      <div className="p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <span className="text-xs font-medium text-gray-500">Next Up</span>
        </div>
        {nextUpcomingTask ? (
          <>
            <p className="text-sm font-semibold text-gray-900 truncate" title={nextUpcomingTask.title}>
              {nextUpcomingTask.title || nextUpcomingTask.type}
            </p>
            <p className="text-xs text-sky-600 mt-0.5">
              {getFutureTime(nextUpcomingTask.due_date || nextUpcomingTask.scheduled_date)}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-400">None scheduled</p>
            <button 
              onClick={onAddTask}
              className="text-xs text-sky-600 hover:text-sky-700 mt-0.5"
            >
              + Add task
            </button>
          </>
        )}
      </div>
    </div>
  </div>
));

ContactTimeline.displayName = 'ContactTimeline';

/**
 * Quick stats section (temperature, score, sessions)
 */
const QuickStats = memo(({ contact, sessionsCount }) => {
  const tempColors = getTemperatureColors(contact?.temperature);
  
  return (
    <div className="px-5 pb-4 flex-shrink-0">
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-3 rounded-xl border ${tempColors.bg} ${tempColors.border}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className={`w-3.5 h-3.5 ${tempColors.text}`} />
            <span className={`text-xs font-medium ${tempColors.text}`}>Temp</span>
          </div>
          <p className={`text-sm font-bold ${tempColors.textBold}`}>{contact?.temperature}</p>
        </div>
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">Score</span>
          </div>
          <p className="text-sm font-bold text-purple-700">{contact?.interest_score || 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-sky-600" />
            <span className="text-xs font-medium text-sky-600">Sessions</span>
          </div>
          <p className="text-sm font-bold text-sky-700">{sessionsCount}</p>
        </div>
      </div>
    </div>
  );
});

QuickStats.displayName = 'QuickStats';

/**
 * Session breakdown section with connection rate
 */
const SessionBreakdown = memo(({ sessionStats }) => (
  <div className="px-5 pb-4 flex-shrink-0">
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Session Breakdown
      </h4>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-gray-600">Connected</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{sessionStats.connected}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600">Not Connected</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{sessionStats.notConnected}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm text-gray-600">Bad Timing</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{sessionStats.badTiming}</span>
        </div>
      </div>
      {/* Connection Rate Bar */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Connection Rate</span>
          <span className="text-xs font-semibold text-gray-700">{sessionStats.connectionRate}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${sessionStats.connectionRate}%` }}
          />
        </div>
      </div>
    </div>
  </div>
));

SessionBreakdown.displayName = 'SessionBreakdown';

/**
 * Contact information section
 */
const ContactInfo = memo(({ contact }) => (
  <div className="px-5 pb-4 flex-shrink-0">
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
      Contact Information
    </h4>
    <div className="space-y-3">
      {contact?.email && (
        <a 
          href={`mailto:${contact.email}`} 
          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900 truncate">{contact.email}</p>
          </div>
        </a>
      )}
      {contact?.phone && (
        <a 
          href={`tel:${contact.phone}`} 
          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors group"
        >
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
            <Phone className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-900">{contact.phone}</p>
          </div>
        </a>
      )}
    </div>
  </div>
));

ContactInfo.displayName = 'ContactInfo';

/**
 * Quick actions section
 */
const QuickActions = memo(({ onAddSession, onAddTask }) => (
  <div className="px-5 pb-4 flex-shrink-0">
    <div className="flex items-center gap-2">
      <button 
        onClick={onAddSession}
        className="flex-1 py-2.5 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Log Session
      </button>
      <button 
        onClick={onAddTask}
        className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
        title="Schedule"
      >
        <Calendar className="w-5 h-5" />
      </button>
    </div>
  </div>
));

QuickActions.displayName = 'QuickActions';

/**
 * Move to Dormant button
 */
const DormantButton = memo(({ onMoveToDormant, currentStatus }) => {
  // Don't show if already dormant
  if (currentStatus === 'DORMANT') return null;
  
  return (
    <button
      onClick={onMoveToDormant}
      className="w-full py-2.5 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg font-medium hover:from-slate-600 hover:to-slate-700 transition-all shadow-md shadow-slate-500/20 flex items-center justify-center gap-2"
      title="Mark this contact as dormant"
    >
      <Moon className="w-4 h-4" />
      Move to Dormant
    </button>
  );
});

DormantButton.displayName = 'DormantButton';

/**
 * Promote button for advancing contact to next stage
 */
const PromoteButton = memo(({ nextStage, onPromote, onMoveToDormant, currentStatus }) => {
  return (
    <div className="px-5 pb-5 mt-auto flex-shrink-0 space-y-2">
      <DormantButton onMoveToDormant={onMoveToDormant} currentStatus={currentStatus} />
      {nextStage && (
        <button
          onClick={onPromote}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          Promote to {nextStage}
        </button>
      )}
    </div>
  );
});

PromoteButton.displayName = 'PromoteButton';

/**
 * Contact sidebar component
 * Displays contact profile, stats, and quick actions
 */
const ContactSidebar = memo(({
  contact,
  averageRating,
  sessionsCount,
  sessionStats,
  lastContactedAt,
  nextUpcomingTask,
  onAddSession,
  onAddTask,
  onPromote,
}) => {
  const nextStage = getNextStage(contact?.status);

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-screen">
      <ProfileHero contact={contact} averageRating={averageRating} />
      <ProfileInfo contact={contact} averageRating={averageRating} />
      <ContactTimeline 
        lastContactedAt={lastContactedAt} 
        nextUpcomingTask={nextUpcomingTask}
        onAddTask={onAddTask}
      />
      <QuickStats contact={contact} sessionsCount={sessionsCount} />
      <SessionBreakdown sessionStats={sessionStats} />
      <ContactInfo contact={contact} />
      <QuickActions onAddSession={onAddSession} onAddTask={onAddTask} />
      <PromoteButton 
        nextStage={nextStage} 
        onPromote={() => onPromote(nextStage)} 
        onMoveToDormant={() => onPromote('DORMANT')}
        currentStatus={contact?.status}
      />
    </div>
  );
});

ContactSidebar.displayName = 'ContactSidebar';

export default ContactSidebar;
