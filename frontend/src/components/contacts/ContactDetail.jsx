import { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Star,
  Edit3,
  Save,
  XCircle,
  MapPin,
  Building2,
  Clock,
  TrendingUp,
  MessageSquare,
  Video,
  Users,
  ChevronRight,
  Flame,
  Thermometer,
  Snowflake,
  Target,
  Activity,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { getSessionsByContact } from '../../services/sessionService';

const ContactDetail = ({ 
  contact, 
  onClose, 
  onUpdate, 
  onEmailClick, 
  onAddSession,
  onFollowupsClick 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState(contact);
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    setEditedContact(contact);
    setIsEditing(false);
    setActiveTab('overview');
    if (contact) {
      fetchSessions();
    }
  }, [contact]);

  const fetchSessions = async () => {
    if (!contact?.contact_id) return;
    try {
      setSessionsLoading(true);
      const data = await getSessionsByContact(contact.contact_id);
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  if (!contact) return null;

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const average_rating = Number(contact.average_rating) || 0;
  const starRating = average_rating ? Math.round((average_rating / 10) * 5) : 0;

  const renderStars = (size = 'md') => {
    const sizeClasses = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses} ${
              star <= starRating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  const handleSave = () => {
    onUpdate(contact.contact_id, editedContact);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContact(contact);
    setIsEditing(false);
  };

  const temperatureConfig = {
    HOT: { 
      bg: 'bg-gradient-to-r from-red-500 to-orange-500', 
      text: 'text-white', 
      label: 'Hot',
      icon: Flame,
      lightBg: 'bg-red-50',
      lightText: 'text-red-600',
      border: 'border-red-200'
    },
    WARM: { 
      bg: 'bg-gradient-to-r from-orange-400 to-yellow-500', 
      text: 'text-white', 
      label: 'Warm',
      icon: Thermometer,
      lightBg: 'bg-orange-50',
      lightText: 'text-orange-600',
      border: 'border-orange-200'
    },
    COLD: { 
      bg: 'bg-gradient-to-r from-blue-400 to-cyan-500', 
      text: 'text-white', 
      label: 'Cold',
      icon: Snowflake,
      lightBg: 'bg-blue-50',
      lightText: 'text-blue-600',
      border: 'border-blue-200'
    },
  };

  const statusConfig = {
    LEAD: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Lead', color: 'slate' },
    MQL: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Marketing Qualified', color: 'blue' },
    SQL: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Sales Qualified', color: 'purple' },
    OPPORTUNITY: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Opportunity', color: 'amber' },
    CUSTOMER: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Customer', color: 'emerald' },
    EVANGELIST: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Evangelist', color: 'pink' },
    DORMANT: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Dormant', color: 'gray' },
  };

  const temp = temperatureConfig[contact.temperature] || temperatureConfig.COLD;
  const status = statusConfig[contact.status] || statusConfig.LEAD;
  const TempIcon = temp.icon;

  const getModeIcon = (mode) => {
    const iconClass = 'w-3.5 h-3.5';
    switch (mode) {
      case 'CALL':
        return <Phone className={iconClass} />;
      case 'EMAIL':
        return <Mail className={iconClass} />;
      case 'DEMO':
        return <Users className={iconClass} />;
      case 'MEETING':
        return <Video className={iconClass} />;
      default:
        return <Phone className={iconClass} />;
    }
  };

  const getStatusColor = (sessionStatus) => {
    switch (sessionStatus) {
      case 'CONNECTED':
        return 'bg-emerald-100 text-emerald-700';
      case 'NOT_CONNECTED':
        return 'bg-red-100 text-red-700';
      case 'BAD_TIMING':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateString);
  };

  // Pipeline progress calculation
  const pipelineStages = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'];
  const currentStageIndex = pipelineStages.indexOf(contact.status);
  const progressPercentage = ((currentStageIndex + 1) / pipelineStages.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1.1px] z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-900">Contact Details</h2>
          <div className="flex items-center gap-1">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500 hover:text-gray-700"
                title="Edit contact"
              >
                <Edit3 className="w-4.5 h-4.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500 hover:text-gray-700"
                  title="Cancel"
                >
                  <XCircle className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleSave}
                  className="p-2 hover:bg-emerald-100 rounded-xl transition-all text-emerald-600 hover:text-emerald-700"
                  title="Save changes"
                >
                  <Save className="w-4.5 h-4.5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500 hover:text-gray-700 ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header Section */}
          <div className="relative">
            {/* Gradient Background */}
            <div className={`h-28 ${temp.bg}`}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
              {/* Decorative Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 w-20 h-20 border border-white/30 rounded-full"></div>
                <div className="absolute top-8 right-12 w-12 h-12 border border-white/20 rounded-full"></div>
              </div>
            </div>
            
            {/* Avatar */}
            <div className="absolute -bottom-14 left-5">
              <div className="relative">
                {!imageError && contact.profile_picture ? (
                  <img
                    src={contact.profile_picture}
                    alt={contact.name}
                    className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white shadow-xl"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-3xl ring-4 ring-white shadow-xl">
                    {getInitials(contact.name)}
                  </div>
                )}
                {/* Temperature Badge on Avatar */}
                <div className={`absolute -bottom-1 -right-1 w-8 h-8 ${temp.bg} rounded-lg flex items-center justify-center shadow-lg ring-2 ring-white`}>
                  <TempIcon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="absolute top-3 left-4">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${status.bg} ${status.text} shadow-sm`}>
                {status.label}
              </span>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-16 px-5 pb-4">
            {isEditing ? (
              <input
                type="text"
                value={editedContact.name}
                onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
                className="text-xl font-bold text-gray-900 w-full border-b-2 border-sky-500 focus:outline-none bg-transparent pb-1"
              />
            ) : (
              <h3 className="text-xl font-bold text-gray-900">{contact.name}</h3>
            )}
            
            {contact.job_title && (
              <p className="text-gray-500 mt-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {contact.job_title}
              </p>
            )}

            {/* Rating Section */}
            <div className="flex items-center gap-3 mt-3">
              {renderStars()}
              <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                {average_rating ? average_rating.toFixed(1) : '0.0'}/10
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl ${temp.lightBg} ${temp.border} border`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TempIcon className={`w-3.5 h-3.5 ${temp.lightText}`} />
                  <span className={`text-xs font-medium ${temp.lightText}`}>Temperature</span>
                </div>
                <p className={`text-sm font-bold ${temp.lightText}`}>{temp.label}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600">Score</span>
                </div>
                <p className="text-sm font-bold text-purple-700">{contact.interest_score || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-xs font-medium text-sky-600">Sessions</span>
                </div>
                <p className="text-sm font-bold text-sky-700">{sessions.length}</p>
              </div>
            </div>
          </div>

          {/* Pipeline Progress */}
          <div className="px-5 pb-5">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pipeline Progress</span>
                <span className="text-xs font-bold text-gray-700">{currentStageIndex + 1}/{pipelineStages.length}</span>
              </div>
              <div className="relative">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                {/* Stage Markers */}
                <div className="flex justify-between mt-2">
                  {pipelineStages.map((stage, index) => (
                    <div 
                      key={stage}
                      className={`text-[10px] font-medium ${
                        index <= currentStageIndex ? 'text-sky-600' : 'text-gray-400'
                      }`}
                    >
                      {index === currentStageIndex ? '●' : '○'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-5 mb-4">
            <div className="flex bg-gray-100 rounded-xl p-1">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'activity', label: 'Activity' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="px-5 pb-6 space-y-4">
              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-sky-500 rounded-full"></span>
                  Contact Information
                </h4>

                <div className="space-y-2">
                  {/* Email */}
                  <div className="group flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Email</p>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editedContact.email}
                          onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
                          className="text-sm text-gray-900 w-full border-b border-gray-300 focus:border-sky-500 focus:outline-none bg-transparent"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 truncate">{contact.email}</p>
                      )}
                    </div>
                    {!isEditing && contact.email && (
                      <button 
                        onClick={() => copyToClipboard(contact.email, 'email')}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded-lg transition-all"
                        title="Copy email"
                      >
                        {copiedField === 'email' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="group flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Phone</p>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editedContact.phone || ''}
                          onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                          className="text-sm text-gray-900 w-full border-b border-gray-300 focus:border-sky-500 focus:outline-none bg-transparent"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{contact.phone || 'Not provided'}</p>
                      )}
                    </div>
                    {!isEditing && contact.phone && (
                      <button 
                        onClick={() => copyToClipboard(contact.phone, 'phone')}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded-lg transition-all"
                        title="Copy phone"
                      >
                        {copiedField === 'phone' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Job Title */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Job Title</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedContact.job_title || ''}
                          onChange={(e) => setEditedContact({ ...editedContact, job_title: e.target.value })}
                          className="text-sm text-gray-900 w-full border-b border-gray-300 focus:border-sky-500 focus:outline-none bg-transparent"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{contact.job_title || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CRM Information */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                  CRM Information
                </h4>

                <div className="space-y-2">
                  {/* Source */}
                  {contact.source && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Lead Source</p>
                        <p className="text-sm text-gray-900 capitalize">{contact.source.replace('_', ' ').toLowerCase()}</p>
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Created</p>
                      <p className="text-sm text-gray-900">{formatDate(contact.created_at)}</p>
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Last Updated</p>
                      <p className="text-sm text-gray-900">{getTimeAgo(contact.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Temperature Selection (Edit Mode) */}
              {isEditing && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-red-500 rounded-full"></span>
                    Lead Temperature
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {['HOT', 'WARM', 'COLD'].map((tempOption) => {
                      const config = temperatureConfig[tempOption];
                      const isSelected = editedContact.temperature === tempOption;
                      const TempOptionIcon = config.icon;
                      return (
                        <button
                          key={tempOption}
                          onClick={() => setEditedContact({ ...editedContact, temperature: tempOption })}
                          className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                            isSelected
                              ? `${config.bg} ${config.text} shadow-lg scale-105`
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <TempOptionIcon className="w-4 h-4" />
                          {tempOption}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="px-5 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                  Recent Activity
                </h4>
                <button
                  onClick={() => onFollowupsClick?.(contact)}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent"></div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No activity yet</p>
                  <p className="text-xs text-gray-400 mt-1">Start by adding a session</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 5).map((session, index) => (
                    <div 
                      key={session.session_id}
                      className="relative pl-6 pb-3 border-l-2 border-gray-200 last:border-transparent"
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${
                        session.session_status === 'CONNECTED' 
                          ? 'bg-emerald-500' 
                          : session.session_status === 'NOT_CONNECTED'
                          ? 'bg-red-400'
                          : 'bg-amber-400'
                      } ring-4 ring-white`}></div>
                      
                      <div className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg ${
                              session.session_status === 'CONNECTED' 
                                ? 'bg-emerald-100 text-emerald-600' 
                                : session.session_status === 'NOT_CONNECTED'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-amber-100 text-amber-600'
                            }`}>
                              {getModeIcon(session.mode_of_contact)}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {session.mode_of_contact?.toLowerCase().replace('_', ' ')} Session
                              </p>
                              <p className="text-xs text-gray-500">{getTimeAgo(session.created_at)}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(session.session_status)}`}>
                            {session.session_status?.replace('_', ' ')}
                          </span>
                        </div>
                        
                        {session.remarks && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2 bg-white rounded-lg p-2">
                            {session.remarks}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= Math.round((session.rating / 10) * 5)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-gray-200 text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">{session.rating}/10</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 p-4 bg-white/80 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onEmailClick?.(contact)}
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all group"
            >
              <Mail className="w-5 h-5 text-gray-600 group-hover:text-sky-600 transition-colors" />
              <span className="text-xs font-medium text-gray-600">Email</span>
            </button>
            <button
              onClick={() => window.open(`tel:${contact.phone}`, '_self')}
              disabled={!contact.phone}
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Phone className="w-5 h-5 text-gray-600 group-hover:text-emerald-600 transition-colors" />
              <span className="text-xs font-medium text-gray-600">Call</span>
            </button>
            <button
              onClick={() => onFollowupsClick?.(contact)}
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all group"
            >
              <MessageSquare className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
              <span className="text-xs font-medium text-gray-600">Follow-ups</span>
            </button>
          </div>
          
          <button
            onClick={() => onAddSession?.(contact)}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30"
          >
            <MessageSquare className="w-4 h-4" />
            Add Session
          </button>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default ContactDetail;
