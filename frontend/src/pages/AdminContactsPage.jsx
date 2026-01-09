import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { useAdmin } from '../context/AdminContext';
import { StatsCard, ContactsTab } from '../components/admin';
import { ContactDetail } from '../components/contacts';
import EmailComposer from '../components/email/EmailComposer';
import { updateContact } from '../services/contactService';

const ROWS_PER_PAGE = 10;
const CONTACT_STATUSES = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'];
const TEMPERATURES = ['HOT', 'WARM', 'COLD'];

const AdminContactsPage = () => {
  const { formatCompact, format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  
  // Get shared data from context (persists across navigation)
  const {
    employees,
    fetchEmployees,
    employeeStats,
    contacts,
    contactsLoading,
    fetchContacts
  } = useAdmin();

  // Local UI state only
  const [selectedContact, setSelectedContact] = useState(null);
  const [emailContact, setEmailContact] = useState(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [filterContactStatus, setFilterContactStatus] = useState('all');
  const [filterTemperature, setFilterTemperature] = useState('all');
  const [filterAssignedEmp, setFilterAssignedEmp] = useState('all');
  const [contactSort, setContactSort] = useState({ column: 'name', direction: 'asc' });
  const [contactPage, setContactPage] = useState(1);

  // Fetch data on mount (uses cache if available)
  useEffect(() => {
    fetchContacts();
    fetchEmployees();
  }, [fetchContacts, fetchEmployees]);

  // Reset page on filter change
  useEffect(() => {
    setContactPage(1);
  }, [contactSearchQuery, filterContactStatus, filterTemperature, filterAssignedEmp]);

  // Handlers
  const handleViewContact = (contact) => setSelectedContact(contact);
  const handleFollowupsClick = (contact) => navigate(`/followups/${contact.contact_id}`);

  const handleUpdateContact = async (contactId, updates) => {
    try {
      await updateContact(contactId, updates);
      await fetchContacts(true); // Force refresh
      if (selectedContact?.contact_id === contactId) {
        setSelectedContact({ ...selectedContact, ...updates });
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      alert(error.response?.data?.message || 'Failed to update contact.');
    }
  };

  const handleContactSort = useCallback((column) => {
    setContactSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Sorting comparator
  const compareValues = useCallback((a, b, column, direction) => {
    let aVal = a[column] ?? '';
    let bVal = b[column] ?? '';

    const numericColumns = ['total_sessions', 'interest_score', 'average_rating'];
    if (numericColumns.includes(column)) {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }

    const dateColumns = ['created_at', 'last_contacted', 'updated_at'];
    if (dateColumns.includes(column)) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }

    if (column === 'temperature') {
      const tempOrder = { HOT: 3, WARM: 2, COLD: 1 };
      aVal = tempOrder[aVal?.toUpperCase()] || 0;
      bVal = tempOrder[bVal?.toUpperCase()] || 0;
    }

    if (column === 'status') {
      const statusOrder = { EVANGELIST: 6, CUSTOMER: 5, OPPORTUNITY: 4, SQL: 3, MQL: 2, LEAD: 1 };
      aVal = statusOrder[aVal?.toUpperCase()] || 0;
      bVal = statusOrder[bVal?.toUpperCase()] || 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  }, []);

  const filteredSortedContacts = useMemo(() => {
    const filtered = contacts.filter(contact => {
      const matchesSearch = contact.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(contactSearchQuery.toLowerCase());
      const matchesStatus = filterContactStatus === 'all' || contact.status === filterContactStatus;
      const matchesTemp = filterTemperature === 'all' || contact.temperature === filterTemperature;
      const matchesEmp = filterAssignedEmp === 'all' || contact.assigned_emp_id === parseInt(filterAssignedEmp);
      return matchesSearch && matchesStatus && matchesTemp && matchesEmp;
    });
    return [...filtered].sort((a, b) => compareValues(a, b, contactSort.column, contactSort.direction));
  }, [contacts, contactSearchQuery, filterContactStatus, filterTemperature, filterAssignedEmp, contactSort, compareValues]);

  const contactTotalPages = Math.ceil(filteredSortedContacts.length / ROWS_PER_PAGE);

  const paginatedContacts = useMemo(() => {
    const start = (contactPage - 1) * ROWS_PER_PAGE;
    return filteredSortedContacts.slice(start, start + ROWS_PER_PAGE);
  }, [filteredSortedContacts, contactPage]);

  return (
    <>
      <StatsCard
        employees={employees}
        activeCount={employeeStats.activeCount}
        invitedCount={employeeStats.invitedCount}
        totalLeads={employeeStats.totalLeads}
        avgLeadsPerEmployee={employeeStats.avgLeadsPerEmployee}
        totalConversions={employeeStats.totalConversions}
        conversionRate={employeeStats.conversionRate}
        totalRevenue={employeeStats.totalRevenue}
        formatCompact={formatCompact}
        formatCurrency={formatCurrency}
      />

      <ContactsTab
        contactSearchQuery={contactSearchQuery}
        setContactSearchQuery={setContactSearchQuery}
        filterContactStatus={filterContactStatus}
        setFilterContactStatus={setFilterContactStatus}
        filterTemperature={filterTemperature}
        setFilterTemperature={setFilterTemperature}
        filterAssignedEmp={filterAssignedEmp}
        setFilterAssignedEmp={setFilterAssignedEmp}
        contactStatuses={CONTACT_STATUSES}
        temperatures={TEMPERATURES}
        employees={employees}
        contactsLoading={contactsLoading}
        filteredSortedContacts={filteredSortedContacts}
        paginatedContacts={paginatedContacts}
        contactSort={contactSort}
        contactPage={contactPage}
        contactTotalPages={contactTotalPages}
        setContactPage={setContactPage}
        ROWS_PER_PAGE={ROWS_PER_PAGE}
        handleContactSort={handleContactSort}
        handleViewContact={handleViewContact}
        handleFollowupsClick={handleFollowupsClick}
      />

      {selectedContact && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedContact(null)} />
          <ContactDetail
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
            onUpdate={handleUpdateContact}
            onFollowupsClick={handleFollowupsClick}
            onEmailClick={(contact) => setEmailContact(contact)}
          />
        </>
      )}

      <EmailComposer
        isOpen={!!emailContact}
        contact={emailContact}
        onClose={() => setEmailContact(null)}
        onSuccess={() => fetchContacts(true)}
      />
    </>
  );
};

export default AdminContactsPage;
