import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Plus, Phone, Mail, Users, Video, Star, ChevronLeft, ChevronRight, 
  ArrowRight, X, Search, Clock, Calendar, Edit, ChevronDown
} from 'lucide-react';
import { getSessionsByContact, createSession } from '../services/sessionService';
import { getContactById, promoteToMQL, promoteToSQL, convertToOpportunity } from '../services/contactService';
import { AddSessionModal, TakeActionModal } from '../components/sessions';
import { TaskModal } from '../components/calendar';
import { createTask } from '../services/taskService';

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
      case 'MAIL':
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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Back button and contact info */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                
                {/* Contact Status Badge */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200">
                    <span className="text-sky-700 font-medium">{contact?.contact_id || contactId}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    contact?.status === 'LEAD' ? 'bg-blue-100 text-blue-700' :
                    contact?.status === 'MQL' ? 'bg-purple-100 text-purple-700' :
                    contact?.status === 'SQL' ? 'bg-orange-100 text-orange-700' :
                    contact?.status === 'OPPORTUNITY' ? 'bg-green-100 text-green-700' :
                    contact?.status === 'CUSTOMER' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {contact?.status}
                  </span>
                </div>
              </div>

              {/* Center: Search */}
              <div className="flex-1 max-w-xl mx-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Clock className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Action Buttons Row */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"> </div>
            <div className="text-sm text-gray-500">
              {sessions.length} Sessions • Avg Rating: {formatRating(averageRating)}/10
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {sessions.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">No follow-ups yet. Add your first session!</p>
                  <button
                    onClick={() => setAddSessionOpen(true)}
                    className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                  >
                    Add Session
                  </button>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
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
                            {renderStars(session.rating || 0)}
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
            )}

            {/* Add New Session Row */}
            {sessions.length > 0 && (
              <div
                onClick={() => setAddSessionOpen(true)}
                className="border-t border-gray-200 py-4 px-4 flex items-center justify-center gap-2 text-sky-600 hover:bg-sky-50 cursor-pointer transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add New Session</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Contact Details Section */}
        <div className="p-4 border-b border-gray-200">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowDetails(!showDetails)}
          >
            <h3 className="text-sky-600 font-medium">Contact Details</h3>
            <ChevronDown className={`w-5 h-5 text-sky-600 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </div>
          
          {showDetails && (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{contact?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{contact?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{contact?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="font-medium text-gray-900">{contact?.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Temperature</p>
                <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${
                  contact?.temperature === 'HOT' ? 'bg-red-100 text-red-700' :
                  contact?.temperature === 'WARM' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {contact?.temperature}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Overall Rating</p>
                <div className="flex items-center gap-2">
                  {renderStars(averageRating)}
                  <span className="font-medium text-gray-900">{formatRating(averageRating)}/10</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scheduled Actions */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-gray-600">No Scheduled Appointment</span>
          </div>
          <button
            onClick={() => setTaskModalOpen(true)}
            className="w-full py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Appointment
          </button>
        </div>

        {/* Take Action Section */}
        {nextStage && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-gray-900 font-medium mb-3">Take Action</h3>
            <div className="p-3 bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg border border-sky-200">
              <p className="text-sm text-gray-600 mb-2">Ready to move forward?</p>
              <p className="text-sm font-medium text-gray-900 mb-3">
                <span className="text-sky-600">{contact?.status}</span>
                {' → '}
                <span className="text-green-600">{nextStage}</span>
              </p>
              <button
                onClick={() => setTakeActionData({ contact, targetStatus: nextStage })}
                className="w-full py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:from-sky-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                Promote
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Session Summary */}
        <div className="p-4 flex-1">
          <h3 className="text-gray-900 font-medium mb-3">Session Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Sessions</span>
              <span className="font-medium">{sessions.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Connected</span>
              <span className="font-medium text-green-600">
                {sessions.filter(s => s.session_status === 'CONNECTED').length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Not Connected</span>
              <span className="font-medium text-red-600">
                {sessions.filter(s => s.session_status === 'NOT_CONNECTED').length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bad Timing</span>
              <span className="font-medium text-yellow-600">
                {sessions.filter(s => s.session_status === 'BAD_TIMING').length}
              </span>
            </div>
          </div>
        </div>
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
        contacts={[]}
        selectedDate={new Date()}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleTaskSave}
        lockedContact={contact}
      />
    </div>
  );
};

export default FollowupsPage;
