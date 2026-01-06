import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ContactGrid, ContactDetail, AddContactModal } from '../components/contacts';
import { AddSessionModal, TakeActionModal } from '../components/sessions';
import EmailComposer from '../components/email/EmailComposer';
import Sidebar from '../components/layout/Sidebar';
import Profile from '../components/layout/Profile';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import CalendarView from '../components/calendar/CalendarView';
import { GmailView } from '../components/gmail';
import { getContacts, createContact, updateContact, promoteToMQL, promoteToSQL, convertToOpportunity } from '../services/contactService';
import { createSession } from '../services/sessionService';
import { Bell, Menu, X, Settings, LogOut, User, ChevronDown } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeStage, setActiveStage] = useState('LEAD');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactCounts, setContactCounts] = useState({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('contacts'); // 'contacts' or 'analytics'
  const userMenuRef = useRef(null);

  // Session/Followup modals
  const [addSessionContact, setAddSessionContact] = useState(null);
  const [takeActionData, setTakeActionData] = useState(null);
  
  // Email compose modal
  const [emailContact, setEmailContact] = useState(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch contacts on mount and when stage changes
  useEffect(() => {
    fetchContacts();
  }, [activeStage]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getContacts({ status: activeStage });
      const contactsArray = Array.isArray(data) ? data : [];
      setContacts(contactsArray);

      // Update counts
      const counts = {};
      counts[activeStage] = contactsArray.length;
      setContactCounts(prev => ({ ...prev, ...counts }));
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError('Failed to load contacts. Please try again.');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (contactData) => {
    try {
      setSubmitting(true);
      setError(null);
      await createContact(contactData);
      await fetchContacts();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating contact:', error);
      setError(error.response?.data?.message || 'Failed to create contact. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateContact = async (contactId, updates) => {
    try {
      setError(null);
      await updateContact(contactId, updates);
      await fetchContacts();
      if (selectedContact && selectedContact.contact_id === contactId) {
        const updatedContact = contacts.find(c => c.contact_id === contactId);
        setSelectedContact(updatedContact);
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      setError(error.response?.data?.message || 'Failed to update contact. Please try again.');
    }
  };

  const handleEmailClick = (contact) => {
    setEmailContact(contact);
  };

  const navigate = useNavigate();

  const handleFollowupsClick = (contact) => {
    navigate(`/followups/${contact.contact_id}`, { state: { contact } });
  };

  const handleAddSession = (contact) => {
    setAddSessionContact(contact);
  };

  const handleSessionSubmit = async (sessionData) => {
    try {
      setSubmitting(true);
      setError(null);
      await createSession(sessionData);
      await fetchContacts(); // Refresh to get updated temperature
      setAddSessionContact(null);
      // navigation-based followups page will handle refresh when opened
    } catch (error) {
      console.error('Error creating session:', error);
      setError(error.response?.data?.message || 'Failed to create session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeAction = (contact, targetStatus) => {
    setTakeActionData({ contact, targetStatus });
  };

  const handleConfirmPromotion = async (contact, targetStatus, additionalData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      if (targetStatus === 'MQL') {
        await promoteToMQL(contact.contact_id);
      } else if (targetStatus === 'SQL') {
        await promoteToSQL(contact.contact_id);
      } else if (targetStatus === 'OPPORTUNITY') {
        await convertToOpportunity(contact.contact_id, additionalData ? additionalData.value : null);
      }
      
      await fetchContacts();
      setTakeActionData(null);
    } catch (error) {
      console.error('Error promoting contact:', error);
      setError(error.response?.data?.message || 'Failed to promote contact. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <div className={`hidden lg:block fixed left-0 top-0 h-screen z-30 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <Sidebar
          activeStage={activeStage}
          onStageChange={(stage) => {
            setActiveStage(stage);
            setActiveView('contacts');
          }}
          contactCounts={contactCounts}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onViewChange={setActiveView}
          activeView={activeView}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <Sidebar
              activeStage={activeStage}
              onStageChange={(stage) => {
                setActiveStage(stage);
                setActiveView('contacts');
                setMobileMenuOpen(false);
              }}
              contactCounts={contactCounts}
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
              onViewChange={(view) => {
                setActiveView(view);
                setMobileMenuOpen(false);
              }}
              activeView={activeView}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            {/* Left - Mobile Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>

              {/* Page Title - Desktop */}
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  {activeView === 'analytics' 
                    ? 'Analytics Dashboard'
                    : activeView === 'calendar'
                    ? 'Calendar'
                    : activeView === 'gmail'
                    ? 'Gmail'
                    : `${activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Pipeline`
                  }
                </h1>
              </div>
            </div>

            {/* Right - User Menu */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Profile Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg py-1.5 pr-2 transition-colors"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.department || user?.role}</p>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {getInitials(user?.name)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <Profile 
                    user={user}
                    logout={logout}
                    setUserMenuOpen={setUserMenuOpen}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mx-4 lg:mx-6 mt-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {activeView === 'analytics' ? (
            <AnalyticsDashboard />
          ) : activeView === 'calendar' ? (
            <CalendarView />
          ) : activeView === 'gmail' ? (
            <GmailView />
          ) : (
            <ContactGrid
              contacts={contacts}
              onContactSelect={setSelectedContact}
              onEmailClick={handleEmailClick}
              onFollowupsClick={handleFollowupsClick}
              onAddContact={() => setShowAddModal(true)}
              loading={loading}
              activeStage={activeStage}
            />
          )}
        </main>
      </div>

      {/* Contact Detail Sidebar */}
      {selectedContact && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedContact(null)}
          />
          <ContactDetail
            contact={selectedContact}
            onEmailClick={handleEmailClick}
            onClose={() => setSelectedContact(null)}
            onUpdate={handleUpdateContact}
            onAddSession={handleAddSession}
            onFollowupsClick={handleFollowupsClick}
          />
        </>
      )}

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddContact}
        loading={submitting}
      />

      {/* Followups Modal */}
      {/* Followups moved to a dedicated page: /followups/:contactId */}

      {/* Add Session Modal */}
      <AddSessionModal
        isOpen={!!addSessionContact}
        contact={addSessionContact}
        onClose={() => setAddSessionContact(null)}
        onSubmit={handleSessionSubmit}
        loading={submitting}
      />

      {/* Take Action Modal */}
      <TakeActionModal
        isOpen={!!takeActionData}
        contact={takeActionData?.contact}
        targetStatus={takeActionData?.targetStatus}
        onClose={() => setTakeActionData(null)}
        onConfirm={handleConfirmPromotion}
        loading={submitting}
      />

      {/* Email Compose Modal */}
      <EmailComposer
        isOpen={!!emailContact}
        contact={emailContact}
        onClose={() => setEmailContact(null)}
        onSuccess={() => {
          // Optionally refresh contacts to show email was sent
          fetchContacts();
        }}
      />
    </div>
  );
};

export default Dashboard;