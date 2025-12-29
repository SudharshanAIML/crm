import { useState } from 'react';
import { X, ArrowRight, AlertCircle } from 'lucide-react';

const TakeActionModal = ({ 
  isOpen, 
  contact, 
  targetStatus, 
  onClose, 
  onConfirm, 
  loading = false 
}) => {
  const [expectedValue, setExpectedValue] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !contact || !targetStatus) return null;

  const requiresValue = targetStatus === 'OPPORTUNITY' || targetStatus === 'CUSTOMER';

  const handleConfirm = () => {
    if (requiresValue && !expectedValue) {
      setError(targetStatus === 'CUSTOMER' ? 'Deal value is required' : 'Expected deal value is required');
      return;
    }

    if (requiresValue && isNaN(parseFloat(expectedValue))) {
      setError('Please enter a valid number');
      return;
    }

    setError('');
    onConfirm(contact, targetStatus, requiresValue ? parseFloat(expectedValue) : null);
  };

  const getValueLabel = () => {
    if (targetStatus === 'CUSTOMER') return 'Closed Deal Value *';
    return 'Expected Deal Value *';
  };

  const getStatusDescription = () => {
    switch (targetStatus) {
      case 'MQL':
        return 'Marketing Qualified Lead - Ready for marketing engagement';
      case 'SQL':
        return 'Sales Qualified Lead - Ready for sales outreach';
      case 'OPPORTUNITY':
        return 'Active sales opportunity with expected deal value';
      case 'CUSTOMER':
        return 'Converted customer - Deal closed successfully';
      case 'EVANGELIST':
        return 'Brand advocate - Highly satisfied customer';
      default:
        return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'LEAD':
        return 'bg-gray-100 text-gray-700';
      case 'MQL':
        return 'bg-blue-100 text-blue-700';
      case 'SQL':
        return 'bg-purple-100 text-purple-700';
      case 'OPPORTUNITY':
        return 'bg-yellow-100 text-yellow-700';
      case 'CUSTOMER':
        return 'bg-green-100 text-green-700';
      case 'EVANGELIST':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Promote Contact</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Contact Info */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{contact.name}</h3>
            <p className="text-sm text-gray-500">{contact.email}</p>
          </div>

          {/* Status Transition */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <span className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(contact.status)}`}>
                {contact.status}
              </span>
              <p className="text-xs text-gray-500 mt-1">Current</p>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <span className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(targetStatus)}`}>
                {targetStatus}
              </span>
              <p className="text-xs text-gray-500 mt-1">New Status</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-sky-800">{getStatusDescription()}</p>
          </div>

          {/* Expected Value Input (for Opportunity or Customer) */}
          {requiresValue && (
            <div className="mb-6">
              <label htmlFor="expectedValue" className="block text-sm font-medium text-gray-700 mb-2">
                {getValueLabel()}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="expectedValue"
                  value={expectedValue}
                  onChange={(e) => {
                    setExpectedValue(e.target.value);
                    setError('');
                  }}
                  className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="10000"
                />
              </div>
              {error && (
                <div className="flex items-center gap-1 mt-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Are you sure?</p>
              <p className="text-sm text-yellow-700">
                This action will change the contact's status and cannot be easily undone.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Confirm Promotion'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeActionModal;