import { memo } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * DeleteConfirmModal - Confirmation modal for deleting employees
 * Simple, focused component for confirmation actions
 */
const DeleteConfirmModal = memo(({
  employee,
  onClose,
  onConfirm,
  actionLoading
}) => {
  if (!employee) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" 
        onClick={onClose} 
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Employee?</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-gray-700">{employee.name}</span>?{' '}
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(employee.emp_id)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

DeleteConfirmModal.displayName = 'DeleteConfirmModal';

export default DeleteConfirmModal;
