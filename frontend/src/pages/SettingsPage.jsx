import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConnectionStatus, getConnectUrl, disconnectEmail } from '../services/emailService';
import { 
  ArrowLeft, 
  Mail, 
  Check, 
  X, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  User,
  Link2,
  Bell,
  Shield,
  Sliders,
  LogOut
} from 'lucide-react';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [emailConnected, setEmailConnected] = useState(false);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailError, setEmailError] = useState(null);
  const [connectingEmail, setConnectingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Your personal information' },
    { id: 'integrations', label: 'Integrations', icon: Link2, description: 'Connected services' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Account protection' },
    { id: 'preferences', label: 'Preferences', icon: Sliders, description: 'App settings' },
  ];

  // Check for OAuth callback params in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('email_connected') === 'true') {
      setEmailConnected(true);
      setActiveTab('integrations');
      setSuccessMessage('Gmail connected successfully!');
      window.history.replaceState({}, '', '/settings');
      setTimeout(() => setSuccessMessage(null), 5000);
    } else if (params.get('email_error')) {
      setEmailError('Failed to connect Gmail account. Please try again.');
      setActiveTab('integrations');
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  // Check email connection status on mount
  useEffect(() => {
    checkEmailStatus();
  }, []);

  const checkEmailStatus = async () => {
    try {
      setEmailLoading(true);
      const status = await getConnectionStatus();
      setEmailConnected(status.connected);
    } catch (error) {
      console.error('Failed to check email status:', error);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConnectEmail = async () => {
    try {
      setConnectingEmail(true);
      setEmailError(null);
      const { authUrl } = await getConnectUrl();
      window.location.href = authUrl;
    } catch (error) {
      setEmailError('Failed to initiate connection. Please try again.');
      setConnectingEmail(false);
    }
  };

  const handleDisconnectEmail = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account? You will not be able to send emails until you reconnect.')) {
      return;
    }
    
    try {
      setEmailLoading(true);
      await disconnectEmail();
      setEmailConnected(false);
      setSuccessMessage('Gmail disconnected successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setEmailError('Failed to disconnect. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Fixed Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 h-screen z-40">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors w-full"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
        </div>

        {/* Settings Title */}
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 mb-1 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 border-l-4 border-sky-500 -ml-0.5'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : 'text-gray-400'}`} />
                <div>
                  <p className={`font-medium text-sm ${isActive ? 'text-sky-700' : 'text-gray-700'}`}>
                    {tab.label}
                  </p>
                  <p className="text-xs text-gray-500">{tab.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64">
        {/* Success Message */}
        {successMessage && (
          <div className="p-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">{successMessage}</p>
              <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-600 hover:text-green-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 lg:p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                    <p className="text-gray-500 mt-1">Update your personal details</p>
                  </div>

                  {/* Avatar Section */}
                  <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                      {getInitials(user?.name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user?.name}</h3>
                      <p className="text-gray-500">{user?.email}</p>
                      <span className="inline-block mt-2 px-3 py-1 bg-sky-100 text-sky-700 text-xs font-medium rounded-full">
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.name}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        disabled
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        defaultValue={user?.phone}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.department}
                        placeholder="e.g., Sales, Marketing"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/25">
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Integrations Tab */}
              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
                    <p className="text-gray-500 mt-1">Connect external services to enhance your workflow</p>
                  </div>

                  {emailError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800 flex-1">{emailError}</p>
                      <button onClick={() => setEmailError(null)} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Gmail Integration */}
                  <div className={`border rounded-2xl p-6 transition-all ${emailConnected ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/25">
                        <Mail className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">Gmail</h3>
                          {emailConnected && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Send emails to contacts directly from your Gmail account
                        </p>
                        {emailConnected && (
                          <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Connected as {user?.email}
                          </p>
                        )}
                      </div>
                      <div>
                        {emailLoading ? (
                          <div className="flex items-center gap-2 text-gray-500 px-4 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Checking...</span>
                          </div>
                        ) : emailConnected ? (
                          <button
                            onClick={handleDisconnectEmail}
                            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={handleConnectEmail}
                            disabled={connectingEmail}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-sky-500/25"
                          >
                            {connectingEmail ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                Connect
                                <ExternalLink className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {!emailConnected && !emailLoading && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Benefits of connecting Gmail:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            'Send emails directly from CRM',
                            'Emails appear from your address',
                            'Track email opens and clicks',
                            'Automatic email history'
                          ].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                              <Check className="w-4 h-4 text-sky-500" />
                              {benefit}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coming Soon */}
                  <div className="border border-dashed border-gray-200 rounded-2xl p-6 opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <span className="text-2xl">📅</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-500">Google Calendar</h3>
                        <p className="text-sm text-gray-400">Coming soon - Sync meetings and events</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
                    <p className="text-gray-500 mt-1">Choose what updates you receive</p>
                  </div>

                  <div className="space-y-1">
                    {[
                      { id: 'email', label: 'Email Notifications', desc: 'Receive notifications via email', checked: true },
                      { id: 'leads', label: 'Lead Updates', desc: 'Get notified when leads change status', checked: true },
                      { id: 'deals', label: 'Deal Alerts', desc: 'Notifications for deal milestones', checked: false },
                      { id: 'tasks', label: 'Task Reminders', desc: 'Reminders for upcoming tasks', checked: true },
                      { id: 'team', label: 'Team Activity', desc: 'Updates from your team members', checked: false },
                    ].map((item) => (
                      <label 
                        key={item.id} 
                        className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            defaultChecked={item.checked}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-checked:bg-sky-500 rounded-full transition-colors"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Security</h2>
                    <p className="text-gray-500 mt-1">Manage your account security settings</p>
                  </div>

                  <div className="p-5 bg-green-50 border border-green-200 rounded-2xl">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-800">Google OAuth Active</h3>
                        <p className="text-sm text-green-700 mt-1">
                          Your account is secured with Google authentication. No password is stored.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Account Role</p>
                          <p className="text-sm text-gray-500">Your permission level</p>
                        </div>
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg capitalize">
                          {user?.role?.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Account Email</p>
                          <p className="text-sm text-gray-500">Primary authentication email</p>
                        </div>
                        <span className="text-sm text-gray-600">{user?.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Preferences</h2>
                    <p className="text-gray-500 mt-1">Customize your CRM experience</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Pipeline View
                      </label>
                      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white">
                        <option>Lead</option>
                        <option>MQL</option>
                        <option>SQL</option>
                        <option>Opportunity</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contacts per Page
                      </label>
                      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white">
                        <option>10</option>
                        <option>25</option>
                        <option>50</option>
                        <option>100</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Format
                      </label>
                      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white">
                        <option>MM/DD/YYYY</option>
                        <option>DD/MM/YYYY</option>
                        <option>YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/25">
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  };

export default SettingsPage;
