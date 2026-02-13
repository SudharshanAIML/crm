import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConnectionStatus, getConnectUrl, disconnectEmail } from '../services/emailService';
import {
  SettingsSidebar,
  ProfileTab,
  IntegrationsTab,
  NotificationsTab,
  SecurityTab,
  PreferencesTab,
  SuccessMessage,
} from '../components/settings';

/**
 * SettingsPage - Main settings page component
 * 
 * Features:
 * - Profile management
 * - Google account integration (Gmail + Calendar)
 * - Notification preferences
 * - Security information
 * - App preferences
 */
const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('profile');
  
  // Email integration state
  const [emailConnected, setEmailConnected] = useState(false);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailError, setEmailError] = useState(null);
  const [connectingEmail, setConnectingEmail] = useState(false);
  
  // UI state
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Dynamic back navigation based on user role
  const backPath = isAdmin ? '/admin' : '/dashboard';
  const backLabel = isAdmin ? 'Admin Dashboard' : 'Dashboard';

  // Check for OAuth callback params in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('email_connected') === 'true') {
      setEmailConnected(true);
      setActiveTab('integrations');
      setSuccessMessage('Google account connected successfully!');
      window.history.replaceState({}, '', '/settings');
      setTimeout(() => setSuccessMessage(null), 5000);
    } else if (params.get('email_error')) {
      setEmailError('Failed to connect Google account. Please try again.');
      setActiveTab('integrations');
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  // Check email connection status on mount
  useEffect(() => {
    checkEmailStatus();
  }, []);

  /**
   * Check Google connection status
   */
  const checkEmailStatus = useCallback(async () => {
    try {
      setEmailLoading(true);
      const status = await getConnectionStatus();
      setEmailConnected(status.connected);
    } catch (error) {
      console.error('Failed to check email status:', error);
    } finally {
      setEmailLoading(false);
    }
  }, []);

  /**
   * Initiate Google OAuth connection
   */
  const handleConnectEmail = useCallback(async () => {
    try {
      setConnectingEmail(true);
      setEmailError(null);
      const { authUrl } = await getConnectUrl();
      window.location.href = authUrl;
    } catch (error) {
      setEmailError('Failed to initiate connection. Please try again.');
      setConnectingEmail(false);
    }
  }, []);

  /**
   * Disconnect Google account
   */
  const handleDisconnectEmail = useCallback(async () => {
    if (!confirm('Are you sure you want to disconnect your Google account? Gmail and Calendar sync will stop working until you reconnect.')) {
      return;
    }
    
    try {
      setEmailLoading(true);
      await disconnectEmail();
      setEmailConnected(false);
      setSuccessMessage('Google account disconnected');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setEmailError('Failed to disconnect. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  }, []);

  /**
   * Navigate back to dashboard
   */
  const handleBack = useCallback(() => {
    navigate(backPath);
  }, [navigate, backPath]);

  /**
   * Clear success message
   */
  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  /**
   * Clear email error
   */
  const handleClearError = useCallback(() => {
    setEmailError(null);
  }, []);

  /**
   * Render the active tab content
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab user={user} />;
      
      case 'integrations':
        return (
          <IntegrationsTab
            emailConnected={emailConnected}
            emailLoading={emailLoading}
            emailError={emailError}
            connectingEmail={connectingEmail}
            userEmail={user?.email}
            onConnect={handleConnectEmail}
            onDisconnect={handleDisconnectEmail}
            onClearError={handleClearError}
          />
        );
      
      case 'notifications':
        return <NotificationsTab />;
      
      case 'security':
        return <SecurityTab user={user} />;
      
      case 'preferences':
        return <PreferencesTab />;
      
      default:
        return <ProfileTab user={user} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Fixed Left Sidebar */}
      <SettingsSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={handleBack}
        backLabel={backLabel}
        user={user}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <main className="flex-1 ml-64">
        {/* Success Message */}
        <SuccessMessage 
          message={successMessage} 
          onDismiss={handleDismissSuccess} 
        />

        {/* Content */}
        <div className="p-6 lg:p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
