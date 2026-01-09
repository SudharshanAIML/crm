import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  StatsCard,
  TeamTab,
  AddEmployeeModal,
  DeleteConfirmModal,
  EmployeeDetailPanel
} from '../components/admin';
import {
  addEmployee,
  removeEmployee,
  updateEmployeeRole,
  resendInvitation,
  toggleEmployeeStatus
} from '../services/employeeService';

const ROWS_PER_PAGE = 10;

const AdminTeamPage = () => {
  const { user } = useAuth();
  const { formatCompact, format: formatCurrency } = useCurrency();
  
  // Get shared data from context (persists across navigation)
  const {
    employees,
    employeesLoading: loading,
    fetchEmployees,
    employeeStats,
    departments,
    activitiesLoading,
    fetchEmployeeActivities
  } = useAdmin();

  // Local UI state only
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeActivities, setEmployeeActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [employeeSort, setEmployeeSort] = useState({ column: 'name', direction: 'asc' });
  const [employeePage, setEmployeePage] = useState(1);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(null);
  
  // Form state
  const [newEmployee, setNewEmployee] = useState({
    name: '', email: '', phone: '', department: '', role: 'EMPLOYEE'
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch employees on mount (uses cache if available)
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Close action menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(null);
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

  // Reset page on filter change
  useEffect(() => {
    setEmployeePage(1);
  }, [searchQuery, filterDepartment, filterStatus]);

  // Handlers
  const handleViewEmployee = async (employee) => {
    setSelectedEmployee(employee);
    const activities = await fetchEmployeeActivities(employee.emp_id);
    setEmployeeActivities(activities);
  };

  const closeEmployeePanel = () => {
    setSelectedEmployee(null);
    setEmployeeActivities([]);
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
      await fetchEmployees(true); // Force refresh
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
      await fetchEmployees(true); // Force refresh
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
      await fetchEmployees(true); // Force refresh
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
      await fetchEmployees(true); // Force refresh
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
      await fetchEmployees(true); // Force refresh
      setActionMenuOpen(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmployeeSort = useCallback((column) => {
    setEmployeeSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Sorting comparator
  const compareValues = useCallback((a, b, column, direction) => {
    let aVal = a[column] ?? '';
    let bVal = b[column] ?? '';

    const numericColumns = ['contactsHandled', 'dealsClosed', 'totalRevenue'];
    if (numericColumns.includes(column)) {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal || '').toLowerCase();
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

  const employeeTotalPages = Math.ceil(filteredSortedEmployees.length / ROWS_PER_PAGE);

  const paginatedEmployees = useMemo(() => {
    const start = (employeePage - 1) * ROWS_PER_PAGE;
    return filteredSortedEmployees.slice(start, start + ROWS_PER_PAGE);
  }, [filteredSortedEmployees, employeePage]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

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

      <TeamTab
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterDepartment={filterDepartment}
        setFilterDepartment={setFilterDepartment}
        departments={departments}
        loading={loading}
        filteredSortedEmployees={filteredSortedEmployees}
        employeeSort={employeeSort}
        paginatedEmployees={paginatedEmployees}
        employeePage={employeePage}
        employeeTotalPages={employeeTotalPages}
        setEmployeePage={setEmployeePage}
        ROWS_PER_PAGE={ROWS_PER_PAGE}
        handleEmployeeSort={handleEmployeeSort}
        handleViewEmployee={handleViewEmployee}
        handleResendInvitation={handleResendInvitation}
        handleRoleChange={handleRoleChange}
        handleToggleStatus={handleToggleStatus}
        setActionMenuOpen={setActionMenuOpen}
        setShowDeleteConfirm={setShowDeleteConfirm}
        setShowAddModal={setShowAddModal}
        getInitials={getInitials}
        formatCurrency={formatCurrency}
        formatCompact={formatCompact}
        inviteLoading={inviteLoading}
        actionMenuOpen={actionMenuOpen}
        user={user}
      />

      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        newEmployee={newEmployee}
        setNewEmployee={setNewEmployee}
        formErrors={formErrors}
        actionLoading={actionLoading}
        onSubmit={handleAddEmployee}
      />

      <DeleteConfirmModal
        isOpen={!!showDeleteConfirm}
        employee={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => handleRemoveEmployee(showDeleteConfirm?.emp_id)}
        actionLoading={actionLoading}
      />

      <EmployeeDetailPanel
        employee={selectedEmployee}
        activities={employeeActivities}
        activitiesLoading={activitiesLoading}
        user={user}
        actionLoading={actionLoading}
        inviteLoading={inviteLoading}
        formatCompact={formatCompact}
        onClose={closeEmployeePanel}
        onRoleChange={handleRoleChange}
        onResendInvitation={handleResendInvitation}
        onToggleStatus={handleToggleStatus}
        onDelete={setShowDeleteConfirm}
      />
    </>
  );
};

export default AdminTeamPage;
