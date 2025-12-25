import { useState, useEffect } from 'react';
import { X, Plus, Star, Calendar, MessageSquare } from 'lucide-react';
import { getContactSessions } from '../../services/sessionService';

const SessionHistory = ({ isOpen, onClose, contact, onAddSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && contact) {
      fetchSessions();
    }
  }, [isOpen, contact]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await getContactSessions(contact.contact_id);
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !contact) return null;

  const getModeIcon = (mode) => {
    const icons = {
      CALL: '📞',
      EMAIL: '📧',
      DEMO: '👥',
      MEETING: '🤝',
    };
    return icons[mode] || '📞';
  };

  const getStatusColor = (status) => {
    const colors = {
      CONNECTED: 'bg-green-100 text-green-700 border-green-200',
      NOT_CONNECTED: 'bg-red-100 text-red-700 border-red-200',
      BAD_TIMING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
        <span className="ml-1 text-xs text-gray-600">{rating}/10</span>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-lg border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Session History</h2>
            <p className="text-sm text-gray-600">{contact.name} • {sessions.length} sessions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onAddSession}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:from-sky-600 hover:to-blue-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Session
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No sessions yet</h3>
              <p className="text-gray-600 mb-6">Start tracking your interactions with this contact</p>
              <button
                onClick={onAddSession}
                className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:from-sky-600 hover:to-blue-700 transition-all"
              >
                Add First Session
              </button>
            </div>
          ) : (
            <div>
              {/* Sessions Timeline - Horizontal Scroll */}
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {sessions.map((session, index) => (
                    <div
                      key={session.session_id}
                      className="flex-shrink-0 w-80 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 hover:shadow-md transition-all"
                    >
                      {/* Session Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getModeIcon(session.mode_of_contact)}</span>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Session #{index + 1}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {session.mode_of_contact.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.session_status)}`}>
                          {session.session_status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="mb-3">
                        {renderStars(session.rating)}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.created_at)}
                      </div>

                      {/* Remarks */}
                      {session.remarks && (
                        <div className="bg-gray-50/50 rounded-lg p-3">
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {session.remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 text-center">
                  <div className="text-2xl font-bold text-sky-600">
                    {sessions.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Sessions</div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(sessions.reduce((sum, s) => sum + s.rating, 0) / sessions.length || 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {sessions.filter(s => s.session_status === 'CONNECTED').length}
                  </div>
                  <div className="text-sm text-gray-600">Connected</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;