import { useState } from 'react';
import { X, Star } from 'lucide-react';

const SessionForm = ({ isOpen, onClose, onSubmit, contact, loading = false }) => {
  const [formData, setFormData] = useState({
    mode_of_contact: 'CALL',
    rating: 5,
    session_status: 'CONNECTED',
    remarks: '',
  });

  const [errors, setErrors] = useState({});

  if (!isOpen || !contact) return null;

  const modeOfContactOptions = [
    { value: 'CALL', label: 'Phone Call', icon: '📞' },
    { value: 'EMAIL', label: 'Email', icon: '📧' },
    { value: 'DEMO', label: 'In Person', icon: '👥' },
    { value: 'MEETING', label: 'Meeting', icon: '🤝' },
  ];

  const sessionStatusOptions = [
    { value: 'CONNECTED', label: 'Connected', color: 'bg-green-100 text-green-700' },
    { value: 'NOT_CONNECTED', label: 'Not Connected', color: 'bg-red-100 text-red-700' },
    { value: 'BAD_TIMING', label: 'Bad Timing', color: 'bg-yellow-100 text-yellow-700' },
  ];

  const validate = () => {
    const newErrors = {};

    if (formData.rating < 1 || formData.rating > 10) {
      newErrors.rating = 'Rating must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        contact_id: contact.contact_id,
        stage: contact.status === 'LEAD' ? 'MQL' : contact.status, // Default stage based on contact status
      });
      // Reset form
      setFormData({
        mode_of_contact: 'CALL',
        rating: 5,
        session_status: 'CONNECTED',
        remarks: '',
      });
      setErrors({});
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleChange('rating', star)}
            className={`w-6 h-6 transition-colors ${
              star <= formData.rating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star className={`w-full h-full ${star <= formData.rating ? 'fill-current' : ''}`} />
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {formData.rating}/10
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/20">
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-lg border-b border-gray-200/50 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Session</h2>
            <p className="text-sm text-gray-600">{contact.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Mode of Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Mode of Contact *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {modeOfContactOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('mode_of_contact', option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    formData.mode_of_contact === option.value
                      ? 'border-sky-500 bg-sky-50/50 text-sky-700'
                      : 'border-gray-200 bg-white/50 text-gray-600 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{option.icon}</span>
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Session Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Session Status *
            </label>
            <div className="space-y-2">
              {sessionStatusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('session_status', option.value)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    formData.session_status === option.value
                      ? 'border-sky-500 bg-sky-50/50'
                      : 'border-gray-200 bg-white/50 hover:bg-gray-50/50'
                  }`}
                >
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${option.color}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rating (1-10) *
            </label>
            <div className="bg-white/50 p-4 rounded-lg border border-gray-200">
              {renderStarRating()}
              <p className="text-xs text-gray-500 mt-2">
                Click stars to rate the session quality
              </p>
            </div>
            {errors.rating && <p className="mt-1 text-sm text-red-600">{errors.rating}</p>}
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
              Remarks / Notes
            </label>
            <textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors bg-white/50 backdrop-blur-sm resize-none"
              placeholder="Add any notes about this session..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100/50 text-gray-700 rounded-lg font-medium hover:bg-gray-200/50 transition-colors backdrop-blur-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Adding...
                </div>
              ) : (
                'Add Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionForm;