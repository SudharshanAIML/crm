import { useState, useEffect, useRef } from 'react';
import { X, Plus, Phone, Mail, Users, Video, Star, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { getSessionsByContact } from '../../services/sessionService';

const FollowupsModal = ({
  isOpen,
  contact,
  onClose,
  onAddSession,
  onTakeAction
}) => {
  const [sessions, setSessions] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen && contact?.contact_id) {
      fetchSessions();
    } else if (!isOpen) {
      // Reset state when modal closes
      setSessions([]);
      setAverageRating(0);
      setError(null);
    }
  }, [isOpen, contact?.contact_id]);

  const fetchSessions = async () => {
    if (!contact?.contact_id) {
      setError('Invalid contact');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSessionsByContact(contact.contact_id);
      // Handle both array response and object response
      if (Array.isArray(data)) {
        setSessions(data);
        // Calculate average from sessions
        const ratings = data.filter(s => s.rating).map(s => s.rating);
        const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        setAverageRating(avg);
      } else if (data && typeof data === 'object') {
        setSessions(data.sessions || []);
        // Ensure averageRating is a number
        const avgRating = Number(data.averageRating) || 0;
        setAverageRating(isNaN(avgRating) ? 0 : avgRating);
      } else {
        setSessions([]);
        setAverageRating(0);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err.response?.data?.message || 'Failed to load follow-ups');
      setSessions([]);
      setAverageRating(0);
    } finally {
      setLoading(false);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  // Safety check for contact
  if (!contact || !contact.contact_id) {
    return null;
  }

  // Helper to safely format rating
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // Get next stage suggestion
  const getNextStage = () => {
    const stages = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'];
    const currentIndex = stages.indexOf(contact.status);
    if (currentIndex < stages.length - 1 && currentIndex >= 0) {
      return stages[currentIndex + 1];
    }
    return null;
  };

  const nextStage = getNextStage();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-lg rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{contact.name}</h2>
            <p className="text-sky-100 text-sm">
              {sessions.length} follow-ups • Avg Rating: {formatRating(averageRating)}/10
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Average Rating Display */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm text-gray-600 mb-1">Overall Rating</p>
              <div className="flex items-center gap-2">
                {renderStars(averageRating)}
                <span className="text-lg font-bold text-gray-900">
                  {formatRating(averageRating)}/10
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Temperature</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${contact.temperature === 'HOT' ? 'bg-red-100 text-red-700' :
                contact.temperature === 'WARM' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                {contact.temperature}
              </span>
            </div>
          </div>

          {/* Sessions Horizontal Scroll */}
          <div className="relative mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Follow-up History</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={scrollLeft}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={scrollRight}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-red-600 mb-3">{error}</p>
                <button
                  onClick={fetchSessions}
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {sessions.length === 0 ? (
                  <div className="flex-1 text-center py-8 text-gray-500">
                    No follow-ups yet. Add your first session!
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.session_id}
                      className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      {/* Session Number & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-500">
                          #{session.session_no}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.session_status)}`}>
                          {session.session_status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Rating: {session.rating || 0}/10</p>
                        {renderStars(session.rating || 0)}
                      </div>

                      {/* Mode of Contact */}
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                        {getModeIcon(session.mode_of_contact)}
                        <span>{session.mode_of_contact?.replace('_', ' ') || 'CALL'}</span>
                      </div>

                      {/* Date */}
                      <p className="text-xs text-gray-500 mb-2">
                        {formatDate(session.created_at)}
                      </p>

                      {/* Feedback */}
                      {(session.feedback || session.remarks) && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">
                            {session.feedback || session.remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Add Session Card */}
                <div
                  onClick={() => onAddSession(contact)}
                  className="flex-shrink-0 w-64 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-all"
                >
                  <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-sky-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Add Session</p>
                  <p className="text-xs text-gray-500">Log a new follow-up</p>
                </div>
              </div>
            )}
          </div>

          {/* Take Action Section */}
          {nextStage && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Take Action</h3>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border border-sky-200">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ready to move forward?</p>
                  <p className="font-medium text-gray-900">
                    Move from <span className="text-sky-600">{contact.status}</span> to{' '}
                    <span className="text-green-600">{nextStage}</span>
                  </p>
                </div>
                <button
                  onClick={() => onTakeAction(contact, nextStage)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:from-sky-600 hover:to-blue-700 transition-all"
                >
                  Promote
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowupsModal;