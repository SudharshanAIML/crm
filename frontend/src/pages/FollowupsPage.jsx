import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Plus, Phone, Mail, Users, Video, Star, ChevronLeft, ChevronRight, 
  ArrowRight, X, Search, Clock, Calendar, Edit, ChevronDown, TrendingUp, 
  MessageSquare, Target, Zap, Award, Activity, Building2, Globe, MapPin,
  Flame, Thermometer, BarChart3, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { getSessionsByContact, createSession } from '../services/sessionService';
import { getContactById, promoteToMQL, promoteToSQL, convertToOpportunity, closeDeal, convertToEvangelist } from '../services/contactService';
import { AddSessionModal, TakeActionModal } from '../components/sessions';
import { TaskModal } from '../components/calendar';
import { createTask, getTasksByContact } from '../services/taskService';

const FollowupsPage = () => {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { } = useAuth();
  
  // Get contact from navigation state or fetch it
  const [contact, setContact] = useState(location.state?.contact || null);
  const [sessions, setSessions] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef(null);

  // Modal states
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [takeActionData, setTakeActionData] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  
  // Upcoming tasks
  const [upcomingTasks, setUpcomingTasks] = useState([]);

  useEffect(() => {
    if (contactId) {
      fetchData();
    }
  }, [contactId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch contact if not passed via navigation state
      if (!contact) {
        const contactData = await getContactById(contactId);
        setContact(contactData);
      }

      // Fetch sessions
      const data = await getSessionsByContact(contactId);
      if (Array.isArray(data)) {
        setSessions(data);
        const ratings = data.filter(s => s.rating).map(s => s.rating);
        const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        setAverageRating(avg);
      } else if (data && typeof data === 'object') {
        setSessions(data.sessions || []);
        const avgRating = Number(data.averageRating) || 0;
        setAverageRating(isNaN(avgRating) ? 0 : avgRating);
      } else {
        setSessions([]);
        setAverageRating(0);
      }
      
      // Fetch upcoming tasks for this contact
      try {
        const tasksData = await getTasksByContact(contactId);
        const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || [];
        // Filter for future tasks and sort by date
        const now = new Date();
        const futureTasks = tasks
          .filter(t => new Date(t.due_date || t.scheduled_date) >= now && t.status !== 'COMPLETED')
          .sort((a, b) => new Date(a.due_date || a.scheduled_date) - new Date(b.due_date || b.scheduled_date));
        setUpcomingTasks(futureTasks);
      } catch (taskErr) {
        console.error('Error fetching tasks:', taskErr);
        setUpcomingTasks([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSubmit = async (sessionData) => {
    try {
      setSubmitting(true);
      setError(null);
      await createSession(sessionData);
      await fetchData();
      setAddSessionOpen(false);
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err.response?.data?.message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPromotion = async (contact, targetStatus, expectedValue) => {
    try {
      setSubmitting(true);
      setError(null);

      if (targetStatus === 'MQL') {
        await promoteToMQL(contact.contact_id);
      } else if (targetStatus === 'SQL') {
        await promoteToSQL(contact.contact_id);
      } else if (targetStatus === 'OPPORTUNITY') {
        await convertToOpportunity(contact.contact_id, expectedValue);
      } else if (targetStatus === 'CUSTOMER') {
        await closeDeal(contact.contact_id, expectedValue);
      } else if (targetStatus === 'EVANGELIST') {
        await convertToEvangelist(contact.contact_id);
      }

      // Refresh contact data after promotion
      const updatedContact = await getContactById(contactId);
      setContact(updatedContact);
      setTakeActionData(null);
    } catch (err) {
      console.error('Error promoting contact:', err);
      setError(err.response?.data?.message || 'Failed to promote contact');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  const formatRating = (rating) => {
    const num = Number(rating);
    if (isNaN(num)) return '0.0';
    return num.toFixed(1);
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'CALL':
        return <Phone className="w-4 h-4" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4" />;
      case 'DEMO':
        return <Users className="w-4 h-4" />;
      case 'MEET':
        return <Video className="w-4 h-4" />;
      default:
        return <Phone className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'NOT_CONNECTED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'BAD_TIMING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-green-500';
      case 'NOT_CONNECTED':
        return 'bg-red-500';
      case 'BAD_TIMING':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const renderStars = (rating) => {
    const stars = Math.round((rating / 10) * 5);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= stars
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  const getNextStage = () => {
    if (!contact) return null;
    const stages = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'];
    const currentIndex = stages.indexOf(contact.status);
    if (currentIndex < stages.length - 1 && currentIndex >= 0) {
      return stages[currentIndex + 1];
    }
    return null;
  };

  const nextStage = getNextStage();

  // Memoized calculations for performance
  const sessionStats = useMemo(() => {
    const connected = sessions.filter(s => s.session_status === 'CONNECTED').length;
    const notConnected = sessions.filter(s => s.session_status === 'NOT_CONNECTED').length;
    const badTiming = sessions.filter(s => s.session_status === 'BAD_TIMING').length;
    const total = sessions.length;
    const connectionRate = total > 0 ? Math.round((connected / total) * 100) : 0;
    
    // Calculate engagement trend (last 5 sessions vs previous 5)
    const recentSessions = sessions.slice(0, 5);
    const olderSessions = sessions.slice(5, 10);
    const recentAvg = recentSessions.length > 0 
      ? recentSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / recentSessions.length 
      : 0;
    const olderAvg = olderSessions.length > 0 
      ? olderSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / olderSessions.length 
      : recentAvg;
    const trend = recentAvg >= olderAvg ? 'up' : 'down';

    return { connected, notConnected, badTiming, total, connectionRate, trend, recentAvg };
  }, [sessions]);

  // Get most recent contact timestamp
  const lastContactedAt = useMemo(() => {
    if (sessions.length === 0) return null;
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    return sortedSessions[0]?.created_at;
  }, [sessions]);

  // Get next upcoming task
  const nextUpcomingTask = useMemo(() => {
    if (upcomingTasks.length === 0) return null;
    return upcomingTasks[0];
  }, [upcomingTasks]);

  // Format relative time
  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  // Format future time
  const getFutureTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffHours < 24) return `in ${diffHours}h`;
    if (diffDays < 7) return `in ${diffDays}d`;
    return formatDate(dateString);
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.mode_of_contact?.toLowerCase().includes(query) ||
      session.session_status?.toLowerCase().includes(query) ||
      session.feedback?.toLowerCase().includes(query) ||
      session.remarks?.toLowerCase().includes(query) ||
      formatDate(session.created_at).toLowerCase().includes(query) ||
      (session.stage || contact?.status || '').toLowerCase().includes(query)
    );
  });

  // Handle task/appointment save
  const handleTaskSave = async (taskData) => {
    try {
      await createTask({
        ...taskData,
        contact_id: contact?.contact_id || contactId,
      });
      setTaskModalOpen(false);
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.response?.data?.message || 'Failed to create appointment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (error && !contact) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Contact</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 flex overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/80 sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back button and contact info */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                </button>
                
                {/* Contact Quick Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-sky-500/20">
                    {getInitials(contact?.name)}
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">{contact?.name}</h1>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        contact?.status === 'LEAD' ? 'bg-blue-100 text-blue-700' :
                        contact?.status === 'MQL' ? 'bg-purple-100 text-purple-700' :
                        contact?.status === 'SQL' ? 'bg-orange-100 text-orange-700' :
                        contact?.status === 'OPPORTUNITY' ? 'bg-green-100 text-green-700' :
                        contact?.status === 'CUSTOMER' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {contact?.status}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{sessions.length} sessions</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Search */}
              <div className="flex-1 max-w-md mx-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sessions by status, mode, feedback..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              {/* Right: Quick Stats & Actions */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-100">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold text-amber-700">{formatRating(averageRating)}</span>
                </div>
                <button 
                  onClick={() => setAddSessionOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-xl hover:from-sky-600 hover:to-indigo-600 transition-all shadow-lg shadow-sky-500/25 flex items-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  New Session
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Sessions Table - Scrollable Area */}
        <div className="flex-1 p-0 overflow-hidden flex flex-col min-h-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 flex-1 overflow-hidden flex flex-col">
            {sessions.length === 0 ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <MessageSquare className="w-10 h-10 text-sky-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Follow-ups Yet</h3>
                  <p className="text-gray-500 mb-6">Start tracking your conversations with {contact?.name} by logging your first session.</p>
                  <button
                    onClick={() => setAddSessionOpen(true)}
                    className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-xl hover:from-sky-600 hover:to-indigo-600 transition-all shadow-lg shadow-sky-500/25 font-medium flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Log First Session
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSessions.map((session, index) => (
                    <>
                      <tr
                        key={session.session_id}
                        onClick={() => setSelectedSession(session)}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedSession?.session_id === session.session_id ? 'bg-sky-50' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <span className="w-6 h-6 bg-sky-100 text-sky-700 text-sm font-medium rounded-full flex items-center justify-center">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-sky-100 text-sky-700 text-sm font-medium rounded">
                            {session.stage || contact?.status || 'MQL'} #{session.session_no || index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            {getModeIcon(session.mode_of_contact)}
                            <span className="text-sm">{session.mode_of_contact?.replace('_', ' ') || 'CALL'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                            session.session_status === 'CONNECTED' 
                              ? 'bg-green-50 border-green-200' 
                              : session.session_status === 'NOT_CONNECTED' 
                              ? 'bg-red-50 border-red-200' 
                              : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${getStatusBadgeColor(session.session_status)}`}></span>
                            <span className={`text-sm font-medium ${
                              session.session_status === 'CONNECTED' ? 'text-green-700' :
                              session.session_status === 'NOT_CONNECTED' ? 'text-red-700' :
                              'text-yellow-700'
                            }`}>
                              {session.session_status?.replace('_', ' ')}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Star className='w-3 h-3 fill-yellow-400 text-yellow-400' />
                            <span className="text-sm text-gray-600">{session.rating || 0}/10</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700">{formatDate(session.created_at)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700">{formatTime(session.created_at)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRow(expandedRow === session.session_id ? null : session.session_id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${
                              expandedRow === session.session_id ? 'rotate-180' : ''
                            }`} />
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Feedback Row */}
                      {expandedRow === session.session_id && (
                        <tr key={`${session.session_id}-feedback`} className="bg-gray-50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="flex items-start gap-3 pl-10">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                                  <Edit className="w-4 h-4 text-sky-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700 mb-1">Feedback / Remarks</p>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {session.feedback || session.remarks || 'No feedback provided for this session.'}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              </div>
            )}

            {/* Add New Session Row */}
            {sessions.length > 0 && (
              <div
                onClick={() => setAddSessionOpen(true)}
                className="border-t border-gray-100 py-4 px-4 flex items-center justify-center gap-2 text-sky-600 hover:bg-gradient-to-r hover:from-sky-50 hover:to-indigo-50 cursor-pointer transition-all group"
              >
                <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-medium">Log Another Session</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Contact Profile (Static) */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-screen">
        {/* Profile Hero Section */}
        <div className="relative flex-shrink-0">
          {/* Gradient Header */}
          <div className={`h-24 ${
            contact?.temperature === 'HOT' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
            contact?.temperature === 'WARM' ? 'bg-gradient-to-r from-orange-400 to-yellow-500' :
            'bg-gradient-to-r from-blue-400 to-cyan-500'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
          </div>
          
          {/* Avatar */}
          <div className="absolute -bottom-12 left-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-xl">
                {getInitials(contact?.name)}
              </div>
              {/* Temperature Badge */}
              <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-white ${
                contact?.temperature === 'HOT' ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                contact?.temperature === 'WARM' ? 'bg-gradient-to-br from-orange-400 to-yellow-500' :
                'bg-gradient-to-br from-blue-400 to-cyan-500'
              }`}>
                <Flame className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 left-4">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
              contact?.status === 'LEAD' ? 'bg-slate-100 text-slate-700' :
              contact?.status === 'MQL' ? 'bg-blue-100 text-blue-700' :
              contact?.status === 'SQL' ? 'bg-purple-100 text-purple-700' :
              contact?.status === 'OPPORTUNITY' ? 'bg-amber-100 text-amber-700' :
              contact?.status === 'CUSTOMER' ? 'bg-emerald-100 text-emerald-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {contact?.status}
            </span>
          </div>
        </div>

        {/* Profile Info */}
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
            {renderStars(averageRating)}
            <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
              {formatRating(averageRating)}/10
            </span>
          </div>
        </div>

        {/* Recently Contacted & Upcoming Schedule */}
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
                    onClick={() => setTaskModalOpen(true)}
                    className="text-xs text-sky-600 hover:text-sky-700 mt-0.5"
                  >
                    + Add task
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-5 pb-4 flex-shrink-0">
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3 rounded-xl border ${
              contact?.temperature === 'HOT' ? 'bg-red-50 border-red-200' :
              contact?.temperature === 'WARM' ? 'bg-orange-50 border-orange-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className={`w-3.5 h-3.5 ${
                  contact?.temperature === 'HOT' ? 'text-red-600' :
                  contact?.temperature === 'WARM' ? 'text-orange-600' :
                  'text-blue-600'
                }`} />
                <span className={`text-xs font-medium ${
                  contact?.temperature === 'HOT' ? 'text-red-600' :
                  contact?.temperature === 'WARM' ? 'text-orange-600' :
                  'text-blue-600'
                }`}>Temp</span>
              </div>
              <p className={`text-sm font-bold ${
                contact?.temperature === 'HOT' ? 'text-red-700' :
                contact?.temperature === 'WARM' ? 'text-orange-700' :
                'text-blue-700'
              }`}>{contact?.temperature}</p>
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
              <p className="text-sm font-bold text-sky-700">{sessions.length}</p>
            </div>
          </div>
        </div>

        {/* Session Breakdown */}
        <div className="px-5 pb-4 flex-shrink-0">
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Session Breakdown</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-gray-600">Connected</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{sessionStats.connected}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-600">Not Connected</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{sessionStats.notConnected}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
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

        {/* Contact Details */}
        <div className="px-5 pb-4 flex-shrink-0">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Information</h4>
          <div className="space-y-3">
            {contact?.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group">
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
              <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors group">
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

        {/* Quick Actions */}
        <div className="px-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setAddSessionOpen(true)}
              className="flex-1 py-2.5 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Log Session
            </button>
            <button 
              onClick={() => setTaskModalOpen(true)}
              className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              title="Schedule"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Promote Button (if applicable) */}
        {nextStage && (
          <div className="px-5 pb-5 mt-auto flex-shrink-0">
            <button
              onClick={() => setTakeActionData({ contact, targetStatus: nextStage })}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Promote to {nextStage}
            </button>
          </div>
        )}
      </div>

      {/* Add Session Modal */}
      <AddSessionModal
        isOpen={addSessionOpen}
        contact={contact}
        onClose={() => setAddSessionOpen(false)}
        onSubmit={handleSessionSubmit}
        loading={submitting}
      />

      {/* Take Action Modal */}
      <TakeActionModal
        isOpen={!!takeActionData}
        contact={takeActionData?.contact}
        targetStatus={takeActionData?.targetStatus}
        onClose={() => setTakeActionData(null)}
        onConfirm={handleConfirmPromotion}
        loading={submitting}
      />

      {/* Task Modal for Appointments */}
      <TaskModal
        isOpen={taskModalOpen}
        task={null}
        contacts={contact ? [contact] : []}
        selectedDate={new Date()}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleTaskSave}
        lockedContact={contact}
      />
    </div>
  );
};

export default FollowupsPage;
