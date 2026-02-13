import { useState, useEffect, useRef, useMemo } from 'react';
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
  DollarSign,
  PieChart,
  Award,
  TrendingDown,
  CircleDollarSign,
  BadgeCheck,
  AlertCircle,
} from 'lucide-react';
import { getSessionsByContact } from '../../services/sessionService';
import { 
  getContactFinancials, 
  getContactAvailability,
  createAvailabilityWindow,
  deleteAvailabilityWindow,
  setDefaultBusinessHours,
  setWeeklySchedule
} from '../../services/contactService';
import { getTasksByContact } from '../../services/taskService';
import { initiateCall } from '../../services/callService';
import { useCurrency } from '../../context/CurrencyContext';

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
  const [financials, setFinancials] = useState(null);
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState(null);
  const sidebarRef = useRef(null);
  
  // Use centralized currency formatting
  const { formatCompact, formatFull } = useCurrency();

  useEffect(() => {
    setEditedContact(contact);
    setIsEditing(false);
    setActiveTab('overview');
    if (contact) {
      fetchSessions();
      fetchFinancials();
      fetchTasks();
      fetchAvailability();
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

  const fetchFinancials = async () => {
    if (!contact?.contact_id) return;
    try {
      setFinancialsLoading(true);
      const data = await getContactFinancials(contact.contact_id);
      setFinancials(data);
    } catch (error) {
      console.error('Error fetching financials:', error);
    } finally {
      setFinancialsLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!contact?.contact_id) return;
    try {
      setTasksLoading(true);
      const data = await getTasksByContact(contact.contact_id);
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!contact?.contact_id) return;
    try {
      setAvailabilityLoading(true);
      const data = await getContactAvailability(contact.contact_id);
      setAvailability(data);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setAvailability(null);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleSetDefaultHours = async () => {
    try {
      await setDefaultBusinessHours(contact.contact_id, Intl.DateTimeFormat().resolvedOptions().timeZone);
      await fetchAvailability();
    } catch (error) {
      console.error('Error setting default hours:', error);
      alert('Failed to set default hours');
    }
  };

  const handleDeleteWindow = async (availabilityId) => {
    if (!confirm('Delete this availability window?')) return;
    try {
      await deleteAvailabilityWindow(contact.contact_id, availabilityId);
      await fetchAvailability();
    } catch (error) {
      console.error('Error deleting window:', error);
      alert('Failed to delete window');
    }
  };

  // Handle initiating a call via Twilio
  const handleCall = async () => {
    if (!contact.phone) {
      alert('Contact does not have a phone number');
      return;
    }

    if (!confirm(`Call ${contact.name} at ${contact.phone}?`)) {
      return;
    }

    try {
      setIsCalling(true);
      setCallStatus('Initiating call...');
      
      const result = await initiateCall(contact.contact_id);
      
      setCallStatus(`Call connected! Status: ${result.data.status}`);
      
      // Auto-clear status after 5 seconds
      setTimeout(() => {
        setCallStatus(null);
      }, 5000);
    } catch (error) {
      console.error('Error initiating call:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to initiate call';
      setCallStatus(errorMessage);
      alert(errorMessage);
      setTimeout(() => {
        setCallStatus(null);
      }, 5000);
    } finally {
      setIsCalling(false);
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

  // Currency formatting now uses the centralized useCurrency hook
  const formatCurrency = formatCompact;
  const formatFullCurrency = (value) => formatFull(value, 0);

  // Format time from HH:MM:SS to 12-hour format
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const timeParts = timeStr.split(':');
      if (timeParts.length < 2) return '';
      
      let hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      if (isNaN(hours) || isNaN(minutes)) return '';
      
      const meridiem = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      
      return `${hours}:${String(minutes).padStart(2, '0')} ${meridiem}`;
    } catch {
      return '';
    }
  };

  // Calculate end time from start time + duration
  const calculateEndTime = (startTime, durationMinutes) => {
    if (!startTime) return null;
    try {
      const timeParts = startTime.split(':');
      if (timeParts.length < 2) return null;
      
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      if (isNaN(hours) || isNaN(minutes)) return null;
      
      const totalMinutes = hours * 60 + minutes + (durationMinutes || 30);
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      
      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    } catch {
      return null;
    }
  };

  // Filter tasks for today and future
  const upcomingTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => task.due_date >= today)
      .sort((a, b) => {
        if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
        return 0;
      });
  }, [tasks]);

  // Calculate time difference in minutes
  const calculateTimeDiff = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  // Calculate availability windows (free time slots)
  const calculateAvailability = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysTasks = tasks
      .filter(task => task.due_date === today && task.status !== 'COMPLETED' && task.status !== 'CANCELLED')
      .sort((a, b) => (a.due_time || '').localeCompare(b.due_time || ''));

    // Get today's day of week (lowercase to match database enum)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDayOfWeek = days[new Date().getDay()];

    // Get availability windows for today from stored data
    const todayAvailabilityWindows = availability?.raw_windows?.filter(
      w => w.day_of_week === todayDayOfWeek && w.is_active
    ) || [];

    // If no availability windows are set, use default business hours
    let businessWindows = todayAvailabilityWindows.length > 0
      ? todayAvailabilityWindows.map(w => ({ start: w.start_time, end: w.end_time }))
      : [{ start: '09:00:00', end: '18:00:00' }]; // Default 9 AM - 6 PM
    
    const availableSlots = [];
    
    businessWindows.forEach(businessWindow => {
      const businessStart = businessWindow.start;
      const businessEnd = businessWindow.end;

      if (todaysTasks.length === 0) {
        // Entire window is available
        const duration = calculateTimeDiff(businessStart, businessEnd);
        availableSlots.push({
          start: businessStart,
          end: businessEnd,
          duration,
        });
      } else {
        let currentTime = businessStart;
        
        // Filter tasks that fall within this business window
        const tasksInWindow = todaysTasks.filter(task => {
          return task.due_time >= businessStart && task.due_time < businessEnd;
        });

        tasksInWindow.forEach((task, index) => {
          const taskStart = task.due_time;
          const taskEnd = calculateEndTime(taskStart, task.duration_minutes || 30);
          
          if (taskStart && taskStart > currentTime) {
            // There's a gap - customer is available
            const gapMinutes = calculateTimeDiff(currentTime, taskStart);
            if (gapMinutes >= 15) { // Only show gaps of 15+ minutes
              availableSlots.push({
                start: currentTime,
                end: taskStart,
                duration: gapMinutes,
              });
            }
          }
          
          // Move current time to end of this task
          if (taskEnd) {
            currentTime = taskEnd;
          }
        });
        
        // Check if there's time after the last task in this window
        if (currentTime < businessEnd) {
          const gapMinutes = calculateTimeDiff(currentTime, businessEnd);
          if (gapMinutes >= 15) {
            availableSlots.push({
              start: currentTime,
              end: businessEnd,
              duration: gapMinutes,
            });
          }
        }
      }
    });
    
    return {
      todaysTasks,
      availableSlots,
      totalAvailableMinutes: availableSlots.reduce((sum, slot) => sum + slot.duration, 0),
      totalBusyMinutes: todaysTasks.reduce((sum, task) => sum + (task.duration_minutes || 30), 0),
      hasStoredAvailability: todayAvailabilityWindows.length > 0,
    };
  }, [tasks, availability]);

  // Determine if contact should show financial data (OPPORTUNITY, CUSTOMER, EVANGELIST)
  const showFinancials = useMemo(() => {
    return ['OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'].includes(contact.status);
  }, [contact.status]);

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
            <div className={`grid ${showFinancials ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
              <div className={`p-3 rounded-xl ${temp.lightBg} ${temp.border} border`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TempIcon className={`w-3.5 h-3.5 ${temp.lightText}`} />
                  <span className={`text-xs font-medium ${temp.lightText}`}>Temperature</span>
                </div>
                <p className={`text-sm font-bold ${temp.lightText}`}>{temp.label}</p>
              </div>
              {!showFinancials && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs font-medium text-purple-600">Score</span>
                  </div>
                  <p className="text-sm font-bold text-purple-700">{contact.interest_score || 0}</p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-xs font-medium text-sky-600">Sessions</span>
                </div>
                <p className="text-sm font-bold text-sky-700">{sessions.length}</p>
              </div>
            </div>

            {/* Financial Quick Stats for Opportunity/Customer/Evangelist */}
            {showFinancials && financials && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-600">Deal Value</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-700">{formatCurrency(financials.summary.totalDealValue)}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-600">Deals</span>
                  </div>
                  <p className="text-sm font-bold text-amber-700">{financials.summary.totalDeals}</p>
                </div>
              </div>
            )}
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
                { id: 'availability', label: 'Availability' },
                ...(showFinancials ? [{ id: 'financials', label: 'Deals' }] : []),
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
          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="px-5 pb-6 space-y-4">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {/* Availability Summary */}
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900">Today's Availability</h4>
                        <p className="text-xs text-emerald-700">When you can reach this contact</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className="text-xs text-emerald-600 font-medium mb-1">Free Time</p>
                        <p className="text-xl font-bold text-emerald-900">
                          {calculateAvailability.totalAvailableMinutes} <span className="text-sm font-normal">min</span>
                        </p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className="text-xs text-gray-600 font-medium mb-1">Busy Time</p>
                        <p className="text-xl font-bold text-gray-900">
                          {calculateAvailability.totalBusyMinutes} <span className="text-sm font-normal">min</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Available Time Slots */}
                  {calculateAvailability.availableSlots.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                        Free Time Windows
                      </h4>
                      <div className="space-y-2">
                        {calculateAvailability.availableSlots.map((slot, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-xl bg-emerald-50 border-l-4 border-emerald-500 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                  <Check className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-emerald-900">
                                      {formatTime(slot.start)}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-sm font-bold text-emerald-900">
                                      {formatTime(slot.end)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-emerald-700">
                                    Available for {slot.duration} minutes
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg text-center">
                                  FREE
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-red-50 rounded-xl border border-red-200">
                      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-red-900">Fully Booked Today</p>
                      <p className="text-xs text-red-600 mt-1">No free time windows available</p>
                    </div>
                  )}

                  {/* Scheduled Appointments (Busy Times) */}
                  {calculateAvailability.todaysTasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-red-500 rounded-full"></span>
                        Busy Times (Avoid Contacting)
                      </h4>
                      <div className="space-y-2">
                        {calculateAvailability.todaysTasks.map((task) => {
                          const startTime = task.due_time;
                          const endTime = calculateEndTime(startTime, task.duration_minutes || 30);

                          return (
                            <div
                              key={task.task_id}
                              className="p-3 rounded-xl bg-red-50 border-l-4 border-red-500 opacity-80"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <X className="w-4 h-4 text-red-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs font-medium text-red-700">
                                        {formatTime(startTime)} - {endTime && formatTime(endTime)}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        ({task.duration_minutes || 30} min)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg flex-shrink-0">
                                  BUSY
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Best Time to Contact */}
                  {calculateAvailability.availableSlots.length > 0 && (
                    <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                          <Target className="w-4 h-4 text-sky-600" />
                        </div>
                        <h4 className="text-sm font-bold text-sky-900">Best Time to Contact</h4>
                      </div>
                      <p className="text-xs text-sky-700 mb-2">
                        Longest available window today
                      </p>
                      <div className="bg-white/60 rounded-lg p-3">
                        {(() => {
                          const longestSlot = calculateAvailability.availableSlots.reduce((max, slot) => 
                            slot.duration > max.duration ? slot : max
                          , calculateAvailability.availableSlots[0]);
                          return (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-sky-900">
                                {formatTime(longestSlot.start)} - {formatTime(longestSlot.end)}
                              </span>
                              <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-medium rounded">
                                {longestSlot.duration} min
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* No Tasks Today */}
                  {tasks.filter(t => t.due_date === new Date().toISOString().split('T')[0]).length === 0 && (
                    <div className="text-center py-6 bg-emerald-50 rounded-xl border border-emerald-200">
                      <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-emerald-900">Available All Day</p>
                      <p className="text-xs text-emerald-700 mt-1">No scheduled appointments today</p>
                      <p className="text-xs text-emerald-600 mt-2">
                        Business hours: 9:00 AM - 6:00 PM
                      </p>
                    </div>
                  )}

                  {/* Availability Settings Panel */}
                  <div className="bg-sky-50 rounded-xl p-4 border border-sky-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-sky-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-sky-900">Availability Schedule</h4>
                          <p className="text-xs text-sky-600">
                            {calculateAvailability.hasStoredAvailability 
                              ? `Custom schedule set (${availability?.timezone || 'UTC'})`
                              : 'Using default 9 AM - 6 PM'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAvailabilityEditor(!showAvailabilityEditor)}
                        className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {showAvailabilityEditor ? 'Close' : 'Edit'}
                      </button>
                    </div>

                    {showAvailabilityEditor && (
                      <div className="mt-3 pt-3 border-t border-sky-200 space-y-3">
                        {!calculateAvailability.hasStoredAvailability && (
                          <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-xs text-sky-700 mb-2">Quick Setup:</p>
                            <button
                              onClick={handleSetDefaultHours}
                              disabled={availabilityLoading}
                              className="w-full px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {availabilityLoading ? 'Setting...' : 'Set Default Hours (Mon-Fri, 9 AM - 5 PM)'}
                            </button>
                          </div>
                        )}

                        {/* Show existing windows */}
                        {availability?.raw_windows && availability.raw_windows.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-sky-700 mb-2">Current Schedule:</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {availability.raw_windows.map((window) => (
                                <div key={window.availability_id} className="flex items-center justify-between bg-white/60 rounded-lg p-2">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-gray-900">{window.day_of_week}</p>
                                    <p className="text-xs text-gray-600">
                                      {formatTime(window.start_time)} - {formatTime(window.end_time)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteWindow(window.availability_id)}
                                    disabled={availabilityLoading}
                                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                    title="Delete window"
                                  >
                                    <X className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add new window form */}
                        <AvailabilityWindowForm 
                          contactId={contact.contact_id}
                          onSuccess={fetchAvailability}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Financials Tab */}
          {activeTab === 'financials' && showFinancials && (
            <div className="px-5 pb-6 space-y-4">
              {financialsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent"></div>
                </div>
              ) : financials ? (
                <>
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Deal Value</span>
                      </div>
                      <p className="text-xl font-bold text-emerald-700">
                        {formatCurrency(financials.summary.totalDealValue)}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        {financials.summary.totalDeals} deal{financials.summary.totalDeals !== 1 ? 's' : ''} closed
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Target className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Expected Value</span>
                      </div>
                      <p className="text-xl font-bold text-amber-700">
                        {formatCurrency(financials.summary.totalExpectedValue)}
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        {financials.summary.totalOpportunities} opportunit{financials.summary.totalOpportunities !== 1 ? 'ies' : 'y'}
                      </p>
                    </div>
                  </div>

                  {/* Opportunity Stats */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Opportunity Stats</h4>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center">
                        <div className="w-10 h-10 mx-auto bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                          <PieChart className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{financials.summary.totalOpportunities}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Total</p>
                      </div>
                      <div className="text-center">
                        <div className="w-10 h-10 mx-auto bg-amber-100 rounded-lg flex items-center justify-center mb-1">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-lg font-bold text-amber-600">{financials.summary.openOpportunities}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Open</p>
                      </div>
                      <div className="text-center">
                        <div className="w-10 h-10 mx-auto bg-emerald-100 rounded-lg flex items-center justify-center mb-1">
                          <BadgeCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-lg font-bold text-emerald-600">{financials.summary.wonOpportunities}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Won</p>
                      </div>
                      <div className="text-center">
                        <div className="w-10 h-10 mx-auto bg-red-100 rounded-lg flex items-center justify-center mb-1">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        </div>
                        <p className="text-lg font-bold text-red-500">{financials.summary.lostOpportunities}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Lost</p>
                      </div>
                    </div>

                    {/* Conversion Rate */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">Conversion Rate</span>
                        <span className="text-sm font-bold text-gray-900">{financials.summary.conversionRate}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${financials.summary.conversionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Deals List */}
                  {financials.deals.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                        Closed Deals
                      </h4>
                      <div className="space-y-2">
                        {financials.deals.map((deal) => (
                          <div 
                            key={deal.deal_id}
                            className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <Award className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatFullCurrency(deal.deal_value)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {deal.closed_by_name ? `Closed by ${deal.closed_by_name}` : 'Deal closed'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">{formatDate(deal.closed_at)}</p>
                              <p className="text-[10px] text-emerald-600 font-medium">
                                Est: {formatCurrency(deal.expected_value)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Open Opportunities */}
                  {financials.opportunities.filter(o => o.status === 'OPEN').length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                        Open Opportunities
                      </h4>
                      <div className="space-y-2">
                        {financials.opportunities.filter(o => o.status === 'OPEN').map((opp) => (
                          <div 
                            key={opp.opportunity_id}
                            className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Target className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatFullCurrency(opp.expected_value)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {opp.emp_name ? `Assigned to ${opp.emp_name}` : 'Unassigned'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg">
                                Open
                              </span>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(opp.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Data State */}
                  {financials.deals.length === 0 && financials.opportunities.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <CircleDollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No deals or opportunities yet</p>
                      <p className="text-xs text-gray-400 mt-1">Financial data will appear here</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <CircleDollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Unable to load financial data</p>
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
              onClick={handleCall}
              disabled={!contact.phone || isCalling}
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <Phone className={`w-5 h-5 ${isCalling ? 'text-emerald-600 animate-pulse' : 'text-gray-600 group-hover:text-emerald-600'} transition-colors`} />
              <span className="text-xs font-medium text-gray-600">
                {isCalling ? 'Calling...' : 'Call'}
              </span>
              {callStatus && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                  {callStatus}
                </span>
              )}
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

// Availability Window Form Component
const AvailabilityWindowForm = ({ contactId, onSuccess }) => {
  const [formData, setFormData] = useState({
    day: 'monday',
    startTime: '09:00',
    endTime: '17:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysOfWeek = [
    { value: 'all_days', label: 'All Days' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (formData.day === 'all_days') {
        // Create availability for all 7 days
        const allDaysSchedule = [
          'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
        ].map(day => ({
          day_of_week: day,
          start_time: formData.startTime + ':00',
          end_time: formData.endTime + ':00',
          timezone: formData.timezone
        }));
        
        // Add to existing schedule by getting current availability and appending
        for (const dayWindow of allDaysSchedule) {
          await createAvailabilityWindow(contactId, dayWindow);
        }
      } else {
        // Create availability for single day
        await createAvailabilityWindow(contactId, {
          day_of_week: formData.day,
          start_time: formData.startTime + ':00',
          end_time: formData.endTime + ':00',
          timezone: formData.timezone
        });
      }
      
      // Reset form
      setFormData({
        day: 'monday',
        startTime: '09:00',
        endTime: '17:00',
        timezone: formData.timezone
      });

      // Refresh availability data
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to add availability window:', error);
      alert('Failed to add availability window. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/60 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-sky-700 mb-2">Add Availability Window:</p>
      
      <div>
        <label className="text-xs text-gray-600 block mb-1">Day</label>
        <select
          value={formData.day}
          onChange={(e) => setFormData({ ...formData, day: e.target.value })}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        >
          {daysOfWeek.map(day => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Start Time</label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">End Time</label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
      >
        {isSubmitting ? 'Adding...' : '+ Add Window'}
      </button>
    </form>
  );
};

export default ContactDetail;
