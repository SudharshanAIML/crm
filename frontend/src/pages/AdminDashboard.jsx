import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  StatsCard,
  AnalyticsTab,
  DashboardHeader,
  TeamTab,
  ContactsTab,
  AddEmployeeModal,
  DeleteConfirmModal,
  EmployeeDetailPanel
} from '../components/admin';
import {
  getTeamWithStatus,
  getEmployeeActivities,
  addEmployee,
  removeEmployee,
  updateEmployeeRole,
  resendInvitation,
  toggleEmployeeStatus
} from '../services/employeeService';
import { getAllContactsAdmin, updateContact } from '../services/contactService';
import { getAdminAnalytics } from '../services/analyticsService';
import { ContactDetail } from '../components/contacts';
import EmailComposer from '../components/email/EmailComposer';

// Constants
const ROWS_PER_PAGE = 10;
const CONTACT_STATUSES = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'];
const TEMPERATURES = ['HOT', 'WARM', 'COLD'];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { formatCompact, format: formatCurrency } = useCurrency();
  const navigate = useNavigate();

  // ==================== STATE ====================
  const [activeTab, setActiveTab] = useState('team');
  
  // Employee states
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeActivities, setEmployeeActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Contact states
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [filterContactStatus, setFilterContactStatus] = useState('all');
  const [filterTemperature, setFilterTemperature] = useState('all');
  const [filterAssignedEmp, setFilterAssignedEmp] = useState('all');
  
  // Analytics states
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  
  // Sorting states
  const [employeeSort, setEmployeeSort] = useState({ column: 'name', direction: 'asc' });
  const [contactSort, setContactSort] = useState({ column: 'name', direction: 'asc' });
  
  // Pagination states
  const [employeePage, setEmployeePage] = useState(1);
  const [contactPage, setContactPage] = useState(1);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [emailContact, setEmailContact] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(null);
  
  // Add employee form
  const [newEmployee, setNewEmployee] = useState({
    name: '', email: '', phone: '', department: '', role: 'EMPLOYEE'
  });
  const [formErrors, setFormErrors] = useState({});

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchEmployees();
    fetchContacts();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(null);
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

  useEffect(() => { setEmployeePage(1); }, [searchQuery, filterDepartment, filterStatus]);
  useEffect(() => { setContactPage(1); }, [contactSearchQuery, filterContactStatus, filterTemperature, filterAssignedEmp]);
  useEffect(() => { if (activeTab === 'analytics') fetchAnalytics(); }, [activeTab]);

  // ==================== FETCH FUNCTIONS ====================
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await getTeamWithStatus();
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeActivities = async (empId) => {
    try {
      setActivitiesLoading(true);
      const data = await getEmployeeActivities(empId);
      setEmployeeActivities(data || []);
    } catch (error) {
      console.error('Error fetching employee activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const data = await getAllContactsAdmin({ limit: 200 });
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setContactsLoading(false);
    }
  };

  const fetchAnalytics = useCallback(async (forceRefresh = false) => {
    if (analytics && !forceRefresh) return;
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const data = await getAdminAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalyticsError('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analytics]);

  // ==================== HANDLERS ====================
  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    fetchEmployeeActivities(employee.emp_id);
  };

  const closeEmployeePanel = () => {
    setSelectedEmployee(null);
    setEmployeeActivities([]);
  };

  const handleViewContact = (contact) => setSelectedContact(contact);
  const handleFollowupsClick = (contact) => navigate(`/followups/${contact.contact_id}`);

  const handleUpdateContact = async (contactId, updates) => {
    try {
      await updateContact(contactId, updates);
      await fetchContacts();
      if (selectedContact?.contact_id === contactId) {
        setSelectedContact({ ...selectedContact, ...updates });
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      alert(error.response?.data?.message || 'Failed to update contact.');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!newEmployee.name.trim()) errors.name = 'Name is required';
    if (!newEmployee.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(newEmployee.email)) errors.email = 'Invalid email format';
    if (!newEmployee.department.trim()) errors.department = 'Department is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setActionLoading(true);
      await addEmployee(newEmployee);
      setShowAddModal(false);
      setNewEmployee({ name: '', email: '', phone: '', department: '', role: 'EMPLOYEE' });
      setFormErrors({});
      await fetchEmployees();
    } catch (error) {
      setFormErrors({ submit: error.response?.data?.message || 'Failed to add employee' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveEmployee = async (empId) => {
    try {
      setActionLoading(true);
      await removeEmployee(empId);
      setShowDeleteConfirm(null);
      if (selectedEmployee?.emp_id === empId) closeEmployeePanel();
      await fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to remove employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (empId, newRole) => {
    try {
      setActionLoading(true);
      await updateEmployeeRole(empId, newRole);
      await fetchEmployees();
      setActionMenuOpen(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvitation = async (empId) => {
    try {
      setInviteLoading(empId);
      await resendInvitation(empId);
      alert('Invitation email sent successfully!');
      await fetchEmployees();
      setActionMenuOpen(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(null);
    }
  };

  const handleToggleStatus = async (empId, currentStatus) => {
    const newStatus = currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    try {
      setActionLoading(true);
      await toggleEmployeeStatus(empId, newStatus);
      await fetchEmployees();
      setActionMenuOpen(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Sorting handlers
  const handleEmployeeSort = useCallback((column) => {
    setEmployeeSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleContactSort = useCallback((column) => {
    setContactSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // ==================== COMPUTED VALUES ====================
  const departments = useMemo(() => 
    [...new Set(employees.map(e => e.department).filter(Boolean))].sort((a, b) => {
      if (a.toLowerCase() === 'other') return 1;
      if (b.toLowerCase() === 'other') return -1;
      return a.localeCompare(b);
    }), [employees]
  );

  const compareValues = useCallback((a, b, column, direction) => {
    let aVal = a[column] ?? '';
    let bVal = b[column] ?? '';
    
    const numericColumns = ['contactsHandled', 'dealsClosed', 'totalRevenue', 'total_sessions', 'interest_score', 'average_rating'];
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

  const filteredSortedEmployees = useMemo(() => {
    const filtered = employees.filter(emp => {
      const matchesSearch = emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            emp.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
      const matchesStatus = filterStatus === 'all' || emp.invitation_status === filterStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
    return [...filtered].sort((a, b) => compareValues(a, b, employeeSort.column, employeeSort.direction));
  }, [employees, searchQuery, filterDepartment, filterStatus, employeeSort, compareValues]);

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

  const employeeTotalPages = Math.ceil(filteredSortedEmployees.length / ROWS_PER_PAGE);
  const contactTotalPages = Math.ceil(filteredSortedContacts.length / ROWS_PER_PAGE);

  const paginatedEmployees = useMemo(() => {
    const start = (employeePage - 1) * ROWS_PER_PAGE;
    return filteredSortedEmployees.slice(start, start + ROWS_PER_PAGE);
  }, [filteredSortedEmployees, employeePage]);

  const paginatedContacts = useMemo(() => {
    const start = (contactPage - 1) * ROWS_PER_PAGE;
    return filteredSortedContacts.slice(start, start + ROWS_PER_PAGE);
  }, [filteredSortedContacts, contactPage]);

  const { activeCount, invitedCount, totalLeads, totalConversions, totalRevenue, conversionRate, avgLeadsPerEmployee } = useMemo(() => {
    const active = employees.filter(e => e.invitation_status === 'ACTIVE').length;
    const invited = employees.filter(e => e.invitation_status === 'INVITED').length;
    const leads = employees.reduce((sum, emp) => sum + (parseInt(emp.contactsHandled) || 0), 0);
    const conversions = employees.reduce((sum, emp) => sum + (parseInt(emp.dealsClosed) || 0), 0);
    const revenue = employees.reduce((sum, emp) => sum + (parseFloat(emp.totalRevenue) || 0), 0);
    return {
      activeCount: active,
      invitedCount: invited,
      totalLeads: leads,
      totalConversions: conversions,
      totalRevenue: revenue,
      conversionRate: leads > 0 ? ((conversions / leads) * 100).toFixed(1) : 0,
      avgLeadsPerEmployee: active > 0 ? Math.round(leads / active) : 0
    };
  }, [employees]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} user={user} logout={logout} />

      <div className="p-6">
        {(activeTab === 'team' || activeTab === 'contacts') && (
          <StatsCard 
            employees={employees} activeCount={activeCount} invitedCount={invitedCount}
            totalLeads={totalLeads} avgLeadsPerEmployee={avgLeadsPerEmployee}
            totalConversions={totalConversions} conversionRate={conversionRate}
            totalRevenue={totalRevenue} formatCompact={formatCompact} formatCurrency={formatCurrency}
          />
        )}

        {activeTab === 'team' && (
          <TeamTab
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterDepartment={filterDepartment} setFilterDepartment={setFilterDepartment}
            departments={departments} loading={loading}
            filteredSortedEmployees={filteredSortedEmployees} employeeSort={employeeSort}
            paginatedEmployees={paginatedEmployees} employeePage={employeePage}
            employeeTotalPages={employeeTotalPages} setEmployeePage={setEmployeePage}
            ROWS_PER_PAGE={ROWS_PER_PAGE} handleEmployeeSort={handleEmployeeSort}
            handleViewEmployee={handleViewEmployee} handleResendInvitation={handleResendInvitation}
            handleRoleChange={handleRoleChange} handleToggleStatus={handleToggleStatus}
            setActionMenuOpen={setActionMenuOpen} setShowDeleteConfirm={setShowDeleteConfirm}
            setShowAddModal={setShowAddModal} getInitials={getInitials}
            formatCurrency={formatCurrency} formatCompact={formatCompact}
            inviteLoading={inviteLoading} actionMenuOpen={actionMenuOpen} user={user}
          />
        )}

        {activeTab === 'contacts' && (
          <ContactsTab
            contactSearchQuery={contactSearchQuery} setContactSearchQuery={setContactSearchQuery}
            filterContactStatus={filterContactStatus} setFilterContactStatus={setFilterContactStatus}
            filterTemperature={filterTemperature} setFilterTemperature={setFilterTemperature}
            filterAssignedEmp={filterAssignedEmp} setFilterAssignedEmp={setFilterAssignedEmp}
            contactStatuses={CONTACT_STATUSES} temperatures={TEMPERATURES} employees={employees}
            contactsLoading={contactsLoading} filteredSortedContacts={filteredSortedContacts}
            paginatedContacts={paginatedContacts} contactSort={contactSort}
            contactPage={contactPage} contactTotalPages={contactTotalPages}
            setContactPage={setContactPage} ROWS_PER_PAGE={ROWS_PER_PAGE}
            handleContactSort={handleContactSort} handleViewContact={handleViewContact}
            handleFollowupsClick={handleFollowupsClick}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            analytics={analytics} analyticsLoading={analyticsLoading} analyticsError={analyticsError}
            onRetry={() => fetchAnalytics(true)}
            formatCompact={formatCompact} formatCurrency={formatCurrency}
          />
        )}
      </div>

      <AddEmployeeModal
        isOpen={showAddModal} onClose={() => setShowAddModal(false)}
        newEmployee={newEmployee} setNewEmployee={setNewEmployee}
        formErrors={formErrors} actionLoading={actionLoading} onSubmit={handleAddEmployee}
      />

      <DeleteConfirmModal
        isOpen={!!showDeleteConfirm} employee={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => handleRemoveEmployee(showDeleteConfirm?.emp_id)}
        actionLoading={actionLoading}
      />

      <EmployeeDetailPanel
        employee={selectedEmployee} activities={employeeActivities}
        activitiesLoading={activitiesLoading} user={user} actionLoading={actionLoading}
        inviteLoading={inviteLoading} formatCompact={formatCompact}
        onClose={closeEmployeePanel} onRoleChange={handleRoleChange}
        onResendInvitation={handleResendInvitation} onToggleStatus={handleToggleStatus}
        onDelete={setShowDeleteConfirm}
      />

      {selectedContact && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedContact(null)} />
          <ContactDetail
            contact={selectedContact} onClose={() => setSelectedContact(null)}
            onUpdate={handleUpdateContact} onFollowupsClick={handleFollowupsClick}
            onEmailClick={(contact) => setEmailContact(contact)}
          />
        </>
      )}

      <EmailComposer
        isOpen={!!emailContact} contact={emailContact}
        onClose={() => setEmailContact(null)} onSuccess={fetchContacts}
      />

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
