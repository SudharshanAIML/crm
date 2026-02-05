import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { ContactGrid, ContactDetail, AddContactModal } from '../components/contacts';
import { AddSessionModal, TakeActionModal } from '../components/sessions';
import EmailComposer from '../components/email/EmailComposer';
import {
  getContacts,
  createContact,
  updateContact,
  promoteToMQL,
  promoteToSQL,
  convertToOpportunity,
} from '../services/contactService';
import { createSession } from '../services/sessionService';
import { useContactsCache } from '../context/ContactsCacheContext';

/**
 * Valid stage slugs mapped to API values
 */
const STAGE_MAP = {
  lead: 'LEAD',
  mql: 'MQL',
  sql: 'SQL',
  opportunity: 'OPPORTUNITY',
  customer: 'CUSTOMER',
  evangelist: 'EVANGELIST',
  dormant: 'DORMANT',
};

/**
 * Contacts page component - displays contacts for a specific pipeline stage
 */
const ContactsPage = memo(() => {
  const { stage: stageSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setError } = useOutletContext();
  const { getCachedContacts, setCachedContacts, invalidateContactsCache } = useContactsCache();

  // Determine if we're in admin routes
  const isAdminRoute = location.pathname.startsWith('/admin');
  const routePrefix = isAdminRoute ? '/admin' : '';

  // Convert URL slug to API stage value
  const activeStage = STAGE_MAP[stageSlug?.toLowerCase()] || 'LEAD';

  // Data State
  const [contacts, setContacts] = useState(() => {
    // Initialize with cached data if available
    const cached = getCachedContacts(activeStage);
    return cached || [];
  });
  const [loading, setLoading] = useState(() => !getCachedContacts(activeStage));
  const [submitting, setSubmitting] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSessionContact, setAddSessionContact] = useState(null);
  const [takeActionData, setTakeActionData] = useState(null);
  const [emailContact, setEmailContact] = useState(null);

  // Fetch contacts when stage changes
  const fetchContacts = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedContacts(activeStage);
      if (cached) {
        setContacts(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError?.(null);
      const data = await getContacts({ status: activeStage });
      const contactsData = Array.isArray(data) ? data : [];
      setContacts(contactsData);
      setCachedContacts(activeStage, contactsData);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError?.('Failed to load contacts. Please try again.');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [activeStage, setError, getCachedContacts, setCachedContacts]);

  useEffect(() => {
    // fetchContacts handles cache checking internally
    fetchContacts();
  }, [fetchContacts]);

  // Contact handlers
  const handleAddContact = useCallback(async (contactData) => {
    try {
      setSubmitting(true);
      setError?.(null);
      await createContact(contactData);
      invalidateContactsCache(activeStage); // Invalidate cache on mutation
      await fetchContacts(true); // Force refresh
      setShowAddModal(false);
    } catch (err) {
      console.error('Error creating contact:', err);
      setError?.(err.response?.data?.message || 'Failed to create contact. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [fetchContacts, setError, invalidateContactsCache, activeStage]);

  const handleUpdateContact = useCallback(async (contactId, updates) => {
    try {
      setError?.(null);
      await updateContact(contactId, updates);
      invalidateContactsCache(activeStage); // Invalidate cache on mutation
      await fetchContacts(true); // Force refresh
      setSelectedContact((prev) =>
        prev?.contact_id === contactId
          ? contacts.find((c) => c.contact_id === contactId)
          : prev
      );
    } catch (err) {
      console.error('Error updating contact:', err);
      setError?.(err.response?.data?.message || 'Failed to update contact. Please try again.');
    }
  }, [contacts, fetchContacts, setError, invalidateContactsCache, activeStage]);

  const handleEmailClick = useCallback((contact) => {
    setEmailContact(contact);
  }, []);

  const handleFollowupsClick = useCallback((contact) => {
    navigate(`${routePrefix}/followups/${contact.contact_id}`, { state: { contact } });
  }, [navigate, routePrefix]);

  const handleAddSession = useCallback((contact) => {
    setAddSessionContact(contact);
  }, []);

  // Session handlers
  const handleSessionSubmit = useCallback(async (sessionData) => {
    try {
      setSubmitting(true);
      setError?.(null);
      await createSession(sessionData);
      invalidateContactsCache(activeStage); // Invalidate cache on mutation
      await fetchContacts(true); // Force refresh
      setAddSessionContact(null);
    } catch (err) {
      console.error('Error creating session:', err);
      setError?.(err.response?.data?.message || 'Failed to create session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [fetchContacts, setError, invalidateContactsCache, activeStage]);

  // Promotion handlers
  const handleConfirmPromotion = useCallback(async (contact, targetStatus, additionalData) => {
    try {
      setSubmitting(true);
      setError?.(null);

      if (targetStatus === 'MQL') {
        await promoteToMQL(contact.contact_id);
      } else if (targetStatus === 'SQL') {
        await promoteToSQL(contact.contact_id);
      } else if (targetStatus === 'OPPORTUNITY') {
        await convertToOpportunity(contact.contact_id, additionalData?.value ?? null);
      }

      // Invalidate both current and target stage caches
      invalidateContactsCache(activeStage);
      invalidateContactsCache(targetStatus);
      await fetchContacts(true); // Force refresh
      setTakeActionData(null);
    } catch (err) {
      console.error('Error promoting contact:', err);
      setError?.(err.response?.data?.message || 'Failed to promote contact. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [fetchContacts, setError, invalidateContactsCache, activeStage]);

  const handleEmailSuccess = useCallback(() => {
    invalidateContactsCache(activeStage);
    fetchContacts(true);
  }, [fetchContacts, invalidateContactsCache, activeStage]);

  return (
    <>
      {/* Contact Grid */}
      <ContactGrid
        contacts={contacts}
        onContactSelect={setSelectedContact}
        onEmailClick={handleEmailClick}
        onFollowupsClick={handleFollowupsClick}
        onAddContact={() => setShowAddModal(true)}
        loading={loading}
        activeStage={activeStage}
        isAdmin={isAdminRoute}
      />

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
        activeStage={activeStage}
      />

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

      {/* Email Composer */}
      <EmailComposer
        isOpen={!!emailContact}
        contact={emailContact}
        onClose={() => setEmailContact(null)}
        onSuccess={handleEmailSuccess}
      />
    </>
  );
});

ContactsPage.displayName = 'ContactsPage';

export default ContactsPage;
