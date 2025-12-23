import { X, User, Mail, Phone, Briefcase, Thermometer } from 'lucide-react';
import { useState } from 'react';

const InputField = ({ icon: Icon, label, name, type = 'text', placeholder, required = false, value, error, focused, onFocus, onBlur, onChange}) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focused ? 'text-sky-500' : 'text-gray-400'
        }`}>
        <Icon className="w-5 h-5" />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl focus:ring-0 focus:bg-white transition-all text-sm ${error
            ? 'border-red-300 focus:border-red-500'
            : 'border-gray-200 focus:border-sky-500'
          }`}
        placeholder={placeholder}
      />
    </div>
    {error && (
      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>
    )}
  </div>
);
const AddContactModal = ({ isOpen, onClose, onSubmit, loading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    job_title: '',
    temperature: 'COLD',
  });

  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);


  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
      setFormData({
        name: '',
        email: '',
        phone: '',
        job_title: '',
        temperature: 'COLD',
      });
      setErrors({});
    }
  };

const handleChange = (field, value) => {
  setFormData(prev => ({
    ...prev,
    [field]: value,
  }));

  if (errors[field]) {
    setErrors(prev => ({
      ...prev,
      [field]: undefined,
    }));
  }
};

  const temperatureOptions = [
    { value: 'HOT', label: 'Hot', color: 'bg-red-500', hoverColor: 'hover:bg-red-100', textColor: 'text-red-600' },
    { value: 'WARM', label: 'Warm', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-100', textColor: 'text-orange-600' },
    { value: 'COLD', label: 'Cold', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-100', textColor: 'text-blue-600' },
  ];


  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Add New Lead</h2>
              <p className="text-sky-100 text-sm mt-1">Fill in the details to create a new lead</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[calc(90vh-200px)]">
          <InputField
            icon={User}
            label="Full Name"
            name="name"
            value={formData.name}
            error={errors.name}
            focused={focusedField === 'name'}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="John Doe"
            required
          />

          <InputField
            icon={Mail}
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            error={errors.email}
            focused={focusedField === 'email'}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="john@example.com"
            required
          />

          <InputField
            icon={Phone}
            label="Phone Number"
            name="phone"
            type="tel"
            value={formData.phone}
            error={errors.phone}
            focused={focusedField === 'phone'}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
          />

          <InputField
            icon={Briefcase}
            label="Job Title"
            name="job_title"
            value={formData.job_title}
            error={errors.job_title}
            focused={focusedField === 'job_title'}
            onFocus={() => setFocusedField('job_title')}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => handleChange('job_title', e.target.value)}
            placeholder="Marketing Manager"
          />

          {/* Temperature Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Lead Temperature <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {temperatureOptions.map((option) => {
                const isSelected = formData.temperature === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('temperature', option.value)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isSelected
                        ? `border-transparent ${option.color} text-white shadow-lg`
                        : `border-gray-200 bg-gray-50 ${option.hoverColor} ${option.textColor}`
                      }`}
                  >
                    <Thermometer className={`w-6 h-6 ${isSelected ? 'text-white' : ''}`} />
                    <span className="font-semibold text-sm">{option.label}</span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                        <svg className={`w-3 h-3 ${option.textColor}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-100 px-8 py-5 bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Creating...</span>
              </div>
            ) : (
              'Create Lead'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;
