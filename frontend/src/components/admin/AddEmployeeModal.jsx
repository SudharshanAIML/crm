import { memo } from 'react';
import { X, Send, RefreshCw } from 'lucide-react';

/**
 * AddEmployeeModal - Modal for inviting new employees
 * Controlled component with form validation
 */
const AddEmployeeModal = memo(({
  isOpen,
  onClose,
  newEmployee,
  setNewEmployee,
  formErrors,
  actionLoading,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50" 
        onClick={onClose} 
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Invite New Employee</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-6 space-y-4">
            {/* Info Banner */}
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-700 flex items-start gap-2">
              <Send className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">An invitation email will be sent</p>
                <p className="text-xs mt-1 text-sky-600">
                  The employee will receive an email with a link to join the CRM. 
                  They can only sign in using Google with this exact email address.
                </p>
              </div>
            </div>

            {formErrors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {formErrors.submit}
              </div>
            )}

            <FormField
              label="Full Name"
              required
              error={formErrors.name}
            >
              <input
                type="text"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  formErrors.name ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="John Doe"
              />
            </FormField>

            <FormField
              label="Email Address"
              required
              error={formErrors.email}
              hint="Must be a Google account email"
            >
              <input
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  formErrors.email ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="john@company.com"
              />
            </FormField>

            <FormField label="Phone Number">
              <input
                type="tel"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="+1 (555) 000-0000"
              />
            </FormField>

            <FormField
              label="Department"
              required
              error={formErrors.department}
            >
              <input
                type="text"
                value={newEmployee.department}
                onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  formErrors.department ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="Sales, Marketing, Support..."
              />
            </FormField>

            <FormField label="Role">
              <select
                value={newEmployee.role}
                onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
            </FormField>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
});

/**
 * FormField - Reusable form field wrapper
 */
const FormField = memo(({ label, required, error, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && '*'}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
));

AddEmployeeModal.displayName = 'AddEmployeeModal';
FormField.displayName = 'FormField';

export default AddEmployeeModal;
