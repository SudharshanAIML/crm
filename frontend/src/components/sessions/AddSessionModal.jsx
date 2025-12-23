import { useState } from 'react';
import { X, Phone, Mail, Users, Video, Star } from 'lucide-react';

const AddSessionModal = ({ isOpen, contact, onClose, onSubmit, loading = false }) => {
  const [formData, setFormData] = useState({
    rating: 5,
    sessionStatus: 'CONNECTED',
    modeOfContact: 'CALL',
    feedback: '',
  });

  const [hoveredRating, setHoveredRating] = useState(0);

  if (!isOpen || !contact) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Map frontend field names to backend field names
    onSubmit({
      contact_id: contact.contact_id,
      rating: formData.rating,
      session_status: formData.sessionStatus,
      mode_of_contact: formData.modeOfContact,
      remarks: formData.feedback,
    });
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const modeOptions = [
    { value: 'CALL', label: 'Call', icon: Phone },
    { value: 'EMAIL', label: 'Email', icon: Mail },
    { value: 'IN_PERSON', label: 'In Person', icon: Users },
    { value: 'MEETING', label: 'Meeting', icon: Video },
  ];

  const statusOptions = [
    { value: 'CONNECTED', label: 'Connected', color: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'NOT_CONNECTED', label: 'Not Connected', color: 'bg-red-100 text-red-700 border-red-300' },
    { value: 'BAD_TIMING', label: 'Bad Timing', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  ];

  // Convert 1-10 rating to display
  const displayRating = hoveredRating || formData.rating;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200/50">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">New Session</h2>
            <p className="text-sm text-gray-500">Log follow-up for {contact.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Mode of Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Mode of Contact
            </label>
            <div className="grid grid-cols-4 gap-2">
              {modeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('modeOfContact', option.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      formData.modeOfContact === option.value
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating (1-10 displayed as stars) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rating ({displayRating}/10)
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleChange('rating', rating)}
                  onMouseEnter={() => setHoveredRating(rating)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 transition-colors ${
                      rating <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {displayRating >= 8 ? '🔥 Hot lead!' : displayRating >= 6 ? '🌡️ Warm lead' : '❄️ Cold lead'}
            </p>
          </div>

          {/* Session Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('sessionStatus', option.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    formData.sessionStatus === option.value
                      ? option.color
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Feedback / Notes
            </label>
            <textarea
              id="feedback"
              value={formData.feedback}
              onChange={(e) => handleChange('feedback', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors resize-none"
              placeholder="Add notes about this follow-up..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSessionModal;