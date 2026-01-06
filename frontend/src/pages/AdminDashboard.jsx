import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { 
  Users, 
  TrendingUp, 
  Target, 
  DollarSign,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Star,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Building2,
  UserPlus,
  Trash2,
  Shield,
  ShieldCheck,
  MoreVertical,
  Send,
  Clock,
  Ban,
  RefreshCw,
  UserCheck,
  UserX,
  Contact,
  Flame,
  Thermometer,
  Snowflake,
  ArrowRight,
  Calendar,
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  PieChart,
  Award,
  Zap,
  TrendingDown,
  Percent,
  Timer,
  PhoneCall,
  Trophy,
  Crown
} from 'lucide-react';
import { 
  getTeamMembers, 
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
import Profile from '../components/layout/Profile';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { formatCompact, format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('team'); // 'team', 'contacts', or 'analytics'
  
  // Employee states
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeActivities, setEmployeeActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  
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
  const ROWS_PER_PAGE = 10;
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [emailContact, setEmailContact] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(null); // Track which employee is being invited
  
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
  // Add employee form
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: 'EMPLOYEE'
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchEmployees();
    fetchContacts();
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(null);
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

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

  // Fetch analytics data when Analytics tab is selected
  const fetchAnalytics = useCallback(async () => {
    if (analytics) return; // Already loaded
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

  // Load analytics when tab changes to analytics
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    fetchEmployeeActivities(employee.emp_id);
  };

  const closeEmployeePanel = () => {
    setSelectedEmployee(null);
    setEmployeeActivities([]);
  };

  const handleViewContact = (contact) => {
    setSelectedContact(contact);
  };

  const handleFollowupsClick = (contact) => {
    navigate(`/followups/${contact.contact_id}`);
  };

  const handleUpdateContact = async (contactId, updates) => {
    try {
      await updateContact(contactId, updates);
      await fetchContacts();
      if (selectedContact && selectedContact.contact_id === contactId) {
        setSelectedContact({ ...selectedContact, ...updates });
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      alert(error.response?.data?.message || 'Failed to update contact. Please try again.');
    }
  };

  // Validate add employee form
  const validateForm = () => {
    const errors = {};
    if (!newEmployee.name.trim()) errors.name = 'Name is required';
    if (!newEmployee.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(newEmployee.email)) errors.email = 'Invalid email format';
    if (!newEmployee.department.trim()) errors.department = 'Department is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle add employee
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
      console.error('Error adding employee:', error);
      setFormErrors({ submit: error.response?.data?.message || 'Failed to add employee' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle remove employee
  const handleRemoveEmployee = async (empId) => {
    try {
      setActionLoading(true);
      await removeEmployee(empId);
      setShowDeleteConfirm(null);
      if (selectedEmployee?.emp_id === empId) {
        closeEmployeePanel();
      }
      await fetchEmployees();
    } catch (error) {
      console.error('Error removing employee:', error);
      alert(error.response?.data?.message || 'Failed to remove employee');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle role change
  const handleRoleChange = async (empId, newRole) => {
    try {
      setActionLoading(true);
      await updateEmployeeRole(empId, newRole);
      await fetchEmployees();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error updating role:', error);
      alert(error.response?.data?.message || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle resend invitation
  const handleResendInvitation = async (empId) => {
    try {
      setInviteLoading(empId);
      await resendInvitation(empId);
      alert('Invitation email sent successfully!');
      await fetchEmployees();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(null);
    }
  };

  // Handle toggle employee status
  const handleToggleStatus = async (empId, currentStatus) => {
    const newStatus = currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    try {
      setActionLoading(true);
      await toggleEmployeeStatus(empId, newStatus);
      await fetchEmployees();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error toggling status:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Get unique departments for filter
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort((a, b) => {
    if (a.toLowerCase() === 'other') return 1;
    if (b.toLowerCase() === 'other') return -1;
    return a.localeCompare(b);
  });

  // Optimized sorting handler using useCallback
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

  // Generic comparator function for optimal sorting
  const compareValues = useCallback((a, b, column, direction) => {
    let aVal = a[column];
    let bVal = b[column];
    
    // Handle null/undefined
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';
    
    // Handle numeric columns
    const numericColumns = ['contactsHandled', 'dealsClosed', 'totalRevenue', 'total_sessions', 'interest_score', 'average_rating'];
    if (numericColumns.includes(column)) {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }
    
    // Handle date columns
    const dateColumns = ['created_at', 'last_contacted', 'updated_at'];
    if (dateColumns.includes(column)) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }
    
    // Handle string columns (case-insensitive)
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }
    
    // Temperature priority order
    if (column === 'temperature') {
      const tempOrder = { HOT: 3, WARM: 2, COLD: 1 };
      aVal = tempOrder[aVal?.toUpperCase()] || 0;
      bVal = tempOrder[bVal?.toUpperCase()] || 0;
    }
    
    // Status priority order
    if (column === 'status') {
      const statusOrder = { EVANGELIST: 6, CUSTOMER: 5, OPPORTUNITY: 4, SQL: 3, MQL: 2, LEAD: 1 };
      aVal = statusOrder[aVal?.toUpperCase()] || 0;
      bVal = statusOrder[bVal?.toUpperCase()] || 0;
    }
    
    // Compare
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  }, []);

  // Memoized filtered and sorted employees - O(n log n) sorting
  const filteredSortedEmployees = useMemo(() => {
    const filtered = employees.filter(emp => {
      const matchesSearch = emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            emp.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
      const matchesStatus = filterStatus === 'all' || emp.invitation_status === filterStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
    
    return [...filtered].sort((a, b) => 
      compareValues(a, b, employeeSort.column, employeeSort.direction)
    );
  }, [employees, searchQuery, filterDepartment, filterStatus, employeeSort, compareValues]);

  // Memoized filtered and sorted contacts - O(n log n) sorting
  const filteredSortedContacts = useMemo(() => {
    const filtered = contacts.filter(contact => {
      const matchesSearch = contact.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                            contact.email?.toLowerCase().includes(contactSearchQuery.toLowerCase());
      const matchesStatus = filterContactStatus === 'all' || contact.status === filterContactStatus;
      const matchesTemp = filterTemperature === 'all' || contact.temperature === filterTemperature;
      const matchesEmp = filterAssignedEmp === 'all' || contact.assigned_emp_id === parseInt(filterAssignedEmp);
      return matchesSearch && matchesStatus && matchesTemp && matchesEmp;
    });
    
    return [...filtered].sort((a, b) => 
      compareValues(a, b, contactSort.column, contactSort.direction)
    );
  }, [contacts, contactSearchQuery, filterContactStatus, filterTemperature, filterAssignedEmp, contactSort, compareValues]);

  // Reset page when filters change
  useEffect(() => {
    setEmployeePage(1);
  }, [searchQuery, filterDepartment, filterStatus]);

  useEffect(() => {
    setContactPage(1);
  }, [contactSearchQuery, filterContactStatus, filterTemperature, filterAssignedEmp]);

  // Pagination calculations - O(1) slice operation
  const employeeTotalPages = Math.ceil(filteredSortedEmployees.length / ROWS_PER_PAGE);
  const contactTotalPages = Math.ceil(filteredSortedContacts.length / ROWS_PER_PAGE);

  // Paginated data - memoized for performance
  const paginatedEmployees = useMemo(() => {
    const startIndex = (employeePage - 1) * ROWS_PER_PAGE;
    return filteredSortedEmployees.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredSortedEmployees, employeePage]);

  const paginatedContacts = useMemo(() => {
    const startIndex = (contactPage - 1) * ROWS_PER_PAGE;
    return filteredSortedContacts.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredSortedContacts, contactPage]);

  // Pagination component
  const Pagination = ({ currentPage, totalPages, totalItems, onPageChange, itemName = 'items' }) => {
    if (totalPages <= 1) return null;
    
    const startItem = (currentPage - 1) * ROWS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ROWS_PER_PAGE, totalItems);
    
    // Calculate visible page numbers (max 5 pages shown)
    const getVisiblePages = () => {
      const pages = [];
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + 4);
      
      // Adjust start if we're near the end
      if (end - start < 4) {
        start = Math.max(1, end - 4);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    };
    
    const visiblePages = getVisiblePages();
    
    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{startItem}</span> to{' '}
          <span className="font-semibold text-gray-900">{endItem}</span> of{' '}
          <span className="font-semibold text-gray-900">{totalItems}</span> {itemName}
        </div>
        
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          
          {/* Previous page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {/* Page numbers */}
          <div className="flex items-center gap-1 mx-1">
            {visiblePages[0] > 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  1
                </button>
                {visiblePages[0] > 2 && (
                  <span className="px-1 text-gray-400">...</span>
                )}
              </>
            )}
            
            {visiblePages.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
            
            {visiblePages[visiblePages.length - 1] < totalPages && (
              <>
                {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                  <span className="px-1 text-gray-400">...</span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          {/* Next page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {/* Last page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Sort icon component
  const SortIcon = ({ column, currentSort }) => {
    if (currentSort.column !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return currentSort.direction === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 text-sky-500" />
      : <ChevronDown className="w-3.5 h-3.5 text-sky-500" />;
  };

  // Calculate invitation stats first (needed for other calculations)
  const invitedCount = employees.filter(e => e.invitation_status === 'INVITED').length;
  const activeCount = employees.filter(e => e.invitation_status === 'ACTIVE').length;
  const disabledCount = employees.filter(e => e.invitation_status === 'DISABLED').length;
  
  // Calculate stats with proper number handling
  const totalLeads = employees.reduce((sum, emp) => sum + (parseInt(emp.contactsHandled) || 0), 0);
  const totalConversions = employees.reduce((sum, emp) => sum + (parseInt(emp.dealsClosed) || 0), 0);
  const totalRevenue = employees.reduce((sum, emp) => sum + (parseFloat(emp.totalRevenue) || 0), 0);
  
  // Calculate conversion rate
  const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0;
  
  // Calculate average leads per active employee
  const avgLeadsPerEmployee = activeCount > 0 ? Math.round(totalLeads / activeCount) : 0;

  // Contact status options
  const contactStatuses = ['LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST'];
  const temperatures = ['HOT', 'WARM', 'COLD'];

  // Get contact status badge
  const getContactStatusBadge = (status) => {
    const statusConfig = {
      LEAD: { bg: 'bg-gray-100', text: 'text-gray-700' },
      MQL: { bg: 'bg-blue-100', text: 'text-blue-700' },
      SQL: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
      OPPORTUNITY: { bg: 'bg-purple-100', text: 'text-purple-700' },
      CUSTOMER: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      EVANGELIST: { bg: 'bg-amber-100', text: 'text-amber-700' },
    };
    const config = statusConfig[status] || statusConfig.LEAD;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  // Get temperature icon
  const getTemperatureIcon = (temp) => {
    switch (temp) {
      case 'HOT':
        return <Flame className="w-4 h-4 text-red-500" />;
      case 'WARM':
        return <Thermometer className="w-4 h-4 text-amber-500" />;
      case 'COLD':
      default:
        return <Snowflake className="w-4 h-4 text-blue-500" />;
    }
  };

  const getInvitationStatusBadge = (status) => {
    switch (status) {
      case 'INVITED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            Invited
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700">
            <Ban className="w-3 h-3" />
            Disabled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
            <AlertCircle className="w-3 h-3" />
            {status || 'Pending'}
          </span>
        );
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

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'NOT_CONNECTED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'BAD_TIMING':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage your team & monitor performance</p>
              </div>
            </div>
            
            {/* Navigation Tabs - Center */}
            <nav className="hidden md:flex items-center gap-2 ml-auto mr-6">
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'team'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Team
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'contacts'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <Contact className="w-4 h-4" />
                Contacts
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 hover:bg-gray-50 rounded-lg py-1.5 px-2 transition-colors"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.department || user?.role}</p>
                  </div>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {getInitials(user?.name)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
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
          
          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2 pb-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === 'team'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Team
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === 'contacts'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Contact className="w-4 h-4" />
              Contacts
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === 'analytics'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          </div>
          {/* Full-width divider under tabs */}
          <div className="border-b border-gray-200 -mx-6" />
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards - Show on Team and Contacts tabs */}
        {(activeTab === 'team' || activeTab === 'contacts') && (
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Organization Overview</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-sky-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">Total Team</p>
                  <p className="text-xl font-bold text-gray-900">{employees.length}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-emerald-600">{activeCount} active</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-amber-600">{invitedCount} pending</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">Total Leads</p>
                  <p className="text-xl font-bold text-gray-900">{totalLeads.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-0.5">~{avgLeadsPerEmployee}/employee</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">Conversions</p>
                  <p className="text-xl font-bold text-gray-900">{totalConversions.toLocaleString()}</p>
                  <p className={`text-xs mt-0.5 ${parseFloat(conversionRate) > 20 ? 'text-emerald-600' : parseFloat(conversionRate) > 10 ? 'text-amber-600' : 'text-gray-500'}`}>
                    {conversionRate}% rate
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">Revenue</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCompact(totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatCurrency(totalConversions > 0 ? Math.round(totalRevenue / totalConversions) : 0, { compact: false })} avg
                  </p>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Team Management Tab */}
        {activeTab === 'team' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-sm text-gray-500">Manage employees and roles</p>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 min-w-0 sm:w-52">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                    />
                  </div>
                  
                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="appearance-none h-9 px-3 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INVITED">Invited</option>
                      <option value="DISABLED">Disabled</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  
                  {/* Department Filter */}
                  <div className="relative">
                    <select
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="appearance-none h-9 px-3 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
                    >
                      <option value="all">All Depts</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  
                  <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-sky-600 hover:to-blue-700 transition-all shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Employee
                </button>
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
              </div>
            ) : filteredSortedEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No employees found</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sky-600 hover:bg-sky-50 rounded-lg font-medium text-sm transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add your first employee
                </button>
              </div>
            ) : (
              <>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th 
                      onClick={() => handleEmployeeSort('name')}
                      className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        Employee
                        <SortIcon column="name" currentSort={employeeSort} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleEmployeeSort('invitation_status')}
                      className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        Status
                        <SortIcon column="invitation_status" currentSort={employeeSort} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleEmployeeSort('department')}
                      className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        Department
                        <SortIcon column="department" currentSort={employeeSort} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleEmployeeSort('contactsHandled')}
                      className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        Leads
                        <SortIcon column="contactsHandled" currentSort={employeeSort} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleEmployeeSort('dealsClosed')}
                      className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        Deals
                        <SortIcon column="dealsClosed" currentSort={employeeSort} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleEmployeeSort('totalRevenue')}
                      className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        Revenue
                        <SortIcon column="totalRevenue" currentSort={employeeSort} />
                      </div>
                    </th>
                    <th className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedEmployees.map((employee) => (
                    <tr key={employee.emp_id} className={`hover:bg-gray-50 transition-colors ${employee.invitation_status === 'DISABLED' ? 'opacity-60' : ''}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            employee.invitation_status === 'DISABLED'
                              ? 'bg-gray-400'
                              : employee.role === 'ADMIN' 
                                ? 'bg-gradient-to-br from-amber-400 to-orange-600' 
                                : 'bg-gradient-to-br from-sky-400 to-blue-600'
                          }`}>
                            {getInitials(employee.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {getInvitationStatusBadge(employee.invitation_status)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                          {employee.department || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <p className="text-sm font-bold text-purple-600">{parseInt(employee.contactsHandled) || 0}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <p className="text-sm font-bold text-emerald-600">{parseInt(employee.dealsClosed) || 0}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <p 
                          className="text-sm font-bold text-amber-600 cursor-help"
                          title={formatCurrency(parseFloat(employee.totalRevenue) || 0, { compact: false })}
                        >
                          {formatCompact(parseFloat(employee.totalRevenue) || 0)}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {employee.invitation_status === 'ACTIVE' && (
                            <button 
                              onClick={() => handleViewEmployee(employee)}
                              className="p-2 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Resend Invite Button for INVITED status */}
                          {employee.invitation_status === 'INVITED' && (
                            <button 
                              onClick={() => handleResendInvitation(employee.emp_id)}
                              disabled={inviteLoading === employee.emp_id}
                              className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Resend Invitation"
                            >
                              {inviteLoading === employee.emp_id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          
                          {/* Actions Menu */}
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpen(actionMenuOpen === employee.emp_id ? null : employee.emp_id);
                              }}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="More Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {actionMenuOpen === employee.emp_id && (
                              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                                {/* Role change options */}
                                {employee.invitation_status === 'ACTIVE' && (
                                  <>
                                    {employee.role === 'EMPLOYEE' ? (
                                      <button
                                        onClick={() => handleRoleChange(employee.emp_id, 'ADMIN')}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                                        Promote to Admin
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleRoleChange(employee.emp_id, 'EMPLOYEE')}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        disabled={employee.emp_id === user?.emp_id}
                                      >
                                        <Shield className="w-4 h-4 text-sky-500" />
                                        Demote to Employee
                                      </button>
                                    )}
                                    <hr className="my-1 border-gray-100" />
                                  </>
                                )}
                                
                                {/* Enable/Disable option */}
                                {employee.emp_id !== user?.emp_id && (
                                  <>
                                    {employee.invitation_status === 'DISABLED' ? (
                                      <button
                                        onClick={() => handleToggleStatus(employee.emp_id, 'DISABLED')}
                                        className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                                      >
                                        <UserCheck className="w-4 h-4" />
                                        Enable Account
                                      </button>
                                    ) : employee.invitation_status === 'ACTIVE' ? (
                                      <button
                                        onClick={() => handleToggleStatus(employee.emp_id, 'ACTIVE')}
                                        className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                                      >
                                        <UserX className="w-4 h-4" />
                                        Disable Account
                                      </button>
                                    ) : null}
                                    <hr className="my-1 border-gray-100" />
                                  </>
                                )}
                                
                                {/* Resend invite for INVITED */}
                                {employee.invitation_status === 'INVITED' && (
                                  <>
                                    <button
                                      onClick={() => handleResendInvitation(employee.emp_id)}
                                      disabled={inviteLoading === employee.emp_id}
                                      className="w-full px-4 py-2 text-left text-sm text-sky-600 hover:bg-sky-50 flex items-center gap-2"
                                    >
                                      <Send className="w-4 h-4" />
                                      Resend Invitation
                                    </button>
                                    <hr className="my-1 border-gray-100" />
                                  </>
                                )}
                                
                                {/* Remove employee */}
                                <button
                                  onClick={() => {
                                    setActionMenuOpen(null);
                                    setShowDeleteConfirm(employee);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  disabled={employee.emp_id === user?.emp_id}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remove Employee
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Employee Pagination */}
              <Pagination
                currentPage={employeePage}
                totalPages={employeeTotalPages}
                totalItems={filteredSortedEmployees.length}
                onPageChange={setEmployeePage}
                itemName="employees"
              />
            </>
            )}
          </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-sm text-gray-500">View and manage all contacts</p>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 min-w-0 sm:w-52">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                    />
                  </div>
                  
                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={filterContactStatus}
                      onChange={(e) => setFilterContactStatus(e.target.value)}
                      className="appearance-none h-9 px-3 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
                    >
                      <option value="all">All Status</option>
                      {contactStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  
                  {/* Temperature Filter */}
                  <div className="relative">
                    <select
                      value={filterTemperature}
                      onChange={(e) => setFilterTemperature(e.target.value)}
                      className="appearance-none h-9 px-3 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
                      >
                        <option value="all">All Temp</option>
                        {temperatures.map(temp => (
                          <option key={temp} value={temp}>{temp}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    
                    {/* Assigned Employee Filter */}
                    <div className="relative">
                      <select
                        value={filterAssignedEmp}
                        onChange={(e) => setFilterAssignedEmp(e.target.value)}
                        className="appearance-none h-9 px-3 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-sm"
                      >
                        <option value="all">All Employees</option>
                        {employees.filter(e => e.invitation_status === 'ACTIVE').map(emp => (
                          <option key={emp.emp_id} value={emp.emp_id}>{emp.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contacts Table */}
              <div className="overflow-x-auto">
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                  </div>
                ) : filteredSortedContacts.length === 0 ? (
                  <div className="text-center py-12">
                    <Contact className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No contacts found</p>
                  </div>
                ) : (
                  <>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th 
                          onClick={() => handleContactSort('name')}
                          className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex items-center gap-1.5">
                            Contact
                            <SortIcon column="name" currentSort={contactSort} />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleContactSort('status')}
                          className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex items-center gap-1.5">
                            Status
                            <SortIcon column="status" currentSort={contactSort} />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleContactSort('temperature')}
                          className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            Temp
                            <SortIcon column="temperature" currentSort={contactSort} />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleContactSort('assigned_emp_name')}
                          className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex items-center gap-1.5">
                            Assigned To
                            <SortIcon column="assigned_emp_name" currentSort={contactSort} />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleContactSort('total_sessions')}
                          className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            Sessions
                            <SortIcon column="total_sessions" currentSort={contactSort} />
                          </div>
                        </th>
                        <th 
                          onClick={() => handleContactSort('last_contacted')}
                          className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex items-center gap-1.5">
                            Last Contact
                            <SortIcon column="last_contacted" currentSort={contactSort} />
                          </div>
                        </th>
                        <th className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedContacts.map((contact) => (
                        <tr key={contact.contact_id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                                contact.temperature === 'HOT' 
                                  ? 'bg-gradient-to-br from-red-400 to-orange-500' 
                                  : contact.temperature === 'WARM'
                                    ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                                    : 'bg-gradient-to-br from-sky-400 to-blue-500'
                              }`}>
                                {getInitials(contact.name)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                                <p className="text-xs text-gray-500">{contact.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {getContactStatusBadge(contact.status)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getTemperatureIcon(contact.temperature)}
                              <span className="text-xs font-medium text-gray-600">{contact.temperature}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {contact.assigned_emp_name ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                                  {getInitials(contact.assigned_emp_name)}
                                </div>
                                <span className="text-sm text-gray-700">{contact.assigned_emp_name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Unassigned</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-sm font-semibold text-gray-700">{contact.total_sessions || 0}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-500">
                              {contact.last_contacted ? formatTimeAgo(contact.last_contacted) : 'Never'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleViewContact(contact)}
                                className="p-2 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleFollowupsClick(contact)}
                                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Go to Followups"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Contact Pagination */}
                  <Pagination
                    currentPage={contactPage}
                    totalPages={contactTotalPages}
                    totalItems={filteredSortedContacts.length}
                    onPageChange={setContactPage}
                    itemName="contacts"
                  />
                  </>
                )}
              </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
                <div className="flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mb-4" />
                  <p className="text-gray-500">Loading analytics...</p>
                </div>
              </div>
            ) : analyticsError ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
                <div className="flex flex-col items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <p className="text-gray-600 mb-4">{analyticsError}</p>
                  <button
                    onClick={() => { setAnalytics(null); fetchAnalytics(); }}
                    className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : analytics ? (
              <>
                {/* Refresh Button */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Company Analytics</h2>
                  <button
                    onClick={() => { setAnalytics(null); fetchAnalytics(); }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-sky-600 hover:bg-white border border-gray-200 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-blue-500 rounded-lg">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-blue-600">Total Contacts</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{analytics.overview.totalContacts.toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-green-500 rounded-lg">
                        <DollarSign className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-green-600">Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{formatCompact(analytics.overview.totalRevenue || 0)}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-purple-500 rounded-lg">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-purple-600">Deals Closed</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{analytics.overview.totalDeals}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-amber-500 rounded-lg">
                        <Percent className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-amber-600">Conversion Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">{analytics.overview.overallConversionRate}%</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-cyan-500 rounded-lg">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-cyan-600">Pipeline Value</span>
                    </div>
                    <p className="text-2xl font-bold text-cyan-900">{formatCompact(analytics.overview.pipelineValue || 0)}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 border border-rose-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-rose-500 rounded-lg">
                        <Timer className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-rose-600">Avg Sales Cycle</span>
                    </div>
                    <p className="text-2xl font-bold text-rose-900">{analytics.overview.avgSalesCycle}d</p>
                  </div>
                </div>

                {/* Period Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Leads (Last 30 days)</span>
                      <span className={`flex items-center gap-1 text-sm font-semibold ${
                        analytics.periodComparison.leads.growth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analytics.periodComparison.leads.growth >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {Math.abs(analytics.periodComparison.leads.growth)}%
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{analytics.periodComparison.leads.current}</p>
                    <p className="text-xs text-gray-400 mt-1">vs {analytics.periodComparison.leads.previous} previous period</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Deals (Last 30 days)</span>
                      <span className={`flex items-center gap-1 text-sm font-semibold ${
                        analytics.periodComparison.deals.growth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analytics.periodComparison.deals.growth >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {Math.abs(analytics.periodComparison.deals.growth)}%
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{analytics.periodComparison.deals.current}</p>
                    <p className="text-xs text-gray-400 mt-1">vs {analytics.periodComparison.deals.previous} previous period</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Revenue (Last 30 days)</span>
                      <span className={`flex items-center gap-1 text-sm font-semibold ${
                          analytics.periodComparison.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {analytics.periodComparison.revenue.growth >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {Math.abs(analytics.periodComparison.revenue.growth)}%
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{formatCompact(analytics.periodComparison.revenue.current || 0)}</p>
                      <p className="text-xs text-gray-400 mt-1">vs {formatCompact(analytics.periodComparison.revenue.previous || 0)} previous period</p>
                    </div>
                  </div>

                  {/* Conversion Funnel & Pipeline Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Conversion Funnel */}
                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-sky-500" />
                        Conversion Funnel
                      </h3>
                      <div className="space-y-3">
                        {analytics.funnel.map((stage, index) => {
                          const maxCount = analytics.funnel[0].count || 1;
                          const percentage = (stage.count / maxCount) * 100;
                          const colors = {
                            'LEAD': 'bg-gray-400',
                            'MQL': 'bg-blue-400',
                            'SQL': 'bg-indigo-500',
                            'OPPORTUNITY': 'bg-purple-500',
                            'CUSTOMER': 'bg-green-500',
                            'EVANGELIST': 'bg-amber-500'
                          };
                          return (
                            <div key={stage.stage}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-medium text-gray-700">{stage.stage}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">{stage.count}</span>
                                  {stage.conversionRate !== undefined && index > 0 && (
                                    <span className="text-xs text-gray-400">({stage.conversionRate}% from prev)</span>
                                  )}
                                </div>
                              </div>
                              <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${colors[stage.stage]} transition-all duration-500 rounded-full`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Opportunity Outcomes */}
                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-sky-500" />
                        Opportunity Outcomes
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Clock className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-2xl font-bold text-blue-900">{analytics.opportunityOutcomes.open.count}</p>
                          <p className="text-xs text-blue-600 font-medium">Open</p>
                          <p className="text-xs text-blue-400 mt-1">
                            {formatCompact(analytics.opportunityOutcomes.open.value)} value
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-xl">
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-2xl font-bold text-green-900">{analytics.opportunityOutcomes.won.count}</p>
                          <p className="text-xs text-green-600 font-medium">Won</p>
                          <p className="text-xs text-green-400 mt-1">
                            {formatCompact(analytics.opportunityOutcomes.won.value)} value
                          </p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-xl">
                          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <XCircle className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-2xl font-bold text-red-900">{analytics.opportunityOutcomes.lost.count}</p>
                          <p className="text-xs text-red-600 font-medium">Lost</p>
                          <p className="text-xs text-red-400 mt-1">
                            {formatCompact(analytics.opportunityOutcomes.lost.value)} value
                          </p>
                        </div>
                      </div>
                      {/* Win Rate */}
                      {(analytics.opportunityOutcomes.won.count + analytics.opportunityOutcomes.lost.count) > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Win Rate</span>
                            <span className="text-lg font-bold text-green-600">
                              {((analytics.opportunityOutcomes.won.count / 
                                (analytics.opportunityOutcomes.won.count + analytics.opportunityOutcomes.lost.count)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Source Performance & Temperature Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lead Sources */}
                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-sky-500" />
                        Lead Source Performance
                      </h3>
                      <div className="space-y-3">
                        {analytics.sourcePerformance.slice(0, 6).map((source) => (
                          <div key={source.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{source.source}</p>
                              <p className="text-xs text-gray-500">{source.totalLeads} leads • {source.converted} converted</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-semibold ${
                                source.conversionRate >= 20 ? 'text-green-600' : 
                                source.conversionRate >= 10 ? 'text-amber-600' : 'text-gray-600'
                              }`}>
                                {source.conversionRate}%
                              </span>
                              <p className="text-xs text-gray-400">conv. rate</p>
                            </div>
                          </div>
                        ))}
                        {analytics.sourcePerformance.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">No source data available</p>
                        )}
                      </div>
                    </div>

                    {/* Temperature Distribution */}
                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-sky-500" />
                        Lead Temperature Distribution
                      </h3>
                      <div className="space-y-4">
                        {analytics.temperatureDistribution.map((temp) => {
                          const icons = {
                            'HOT': <Flame className="w-5 h-5 text-red-500" />,
                            'WARM': <Thermometer className="w-5 h-5 text-amber-500" />,
                            'COLD': <Snowflake className="w-5 h-5 text-blue-500" />
                          };
                          const colors = {
                            'HOT': 'bg-red-100 border-red-200 text-red-800',
                            'WARM': 'bg-amber-100 border-amber-200 text-amber-800',
                            'COLD': 'bg-blue-100 border-blue-200 text-blue-800'
                          };
                          const barColors = {
                            'HOT': 'bg-red-500',
                            'WARM': 'bg-amber-500',
                            'COLD': 'bg-blue-500'
                          };
                          const totalTemp = analytics.temperatureDistribution.reduce((acc, t) => acc + t.count, 0);
                          const percentage = totalTemp > 0 ? (temp.count / totalTemp) * 100 : 0;
                          
                          return (
                            <div key={temp.temperature} className={`p-4 rounded-xl border ${colors[temp.temperature]}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {icons[temp.temperature]}
                                  <span className="font-semibold">{temp.temperature}</span>
                                </div>
                                <span className="text-lg font-bold">{temp.count}</span>
                              </div>
                              <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-2">
                                <div 
                                  className={`h-full ${barColors[temp.temperature]} transition-all`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs opacity-75">
                                <span>{percentage.toFixed(1)}% of total</span>
                                <span>{temp.conversionRate}% conv. rate</span>
                              </div>
                            </div>
                          );
                        })}
                        {analytics.temperatureDistribution.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">No temperature data available</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Session Statistics */}
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-sky-500" />
                      Session Statistics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{analytics.sessionStats.total}</p>
                        <p className="text-xs text-gray-500">Total Sessions</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{analytics.sessionStats.connected}</p>
                        <p className="text-xs text-green-600">Connected</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{analytics.sessionStats.notConnected}</p>
                        <p className="text-xs text-red-600">Not Connected</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-600">{analytics.sessionStats.badTiming}</p>
                        <p className="text-xs text-amber-600">Bad Timing</p>
                      </div>
                      <div className="text-center p-3 bg-sky-50 rounded-lg">
                        <p className="text-2xl font-bold text-sky-600">{analytics.sessionStats.connectionRate}%</p>
                        <p className="text-xs text-sky-600">Connection Rate</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
                          <p className="text-2xl font-bold text-purple-600">{analytics.sessionStats.avgRating}</p>
                        </div>
                        <p className="text-xs text-purple-600">Avg Rating</p>
                      </div>
                    </div>
                  </div>

                  {/* Employee Leaderboard */}
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Employee Leaderboard
                      </h3>
                      {analytics.employeeLeaderboard.length > 7 && (
                        <span className="text-xs text-gray-400">
                          {analytics.employeeLeaderboard.length} employees
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">Rank</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">Employee</th>
                              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">Contacts</th>
                              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">Conversions</th>
                              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">Conv. Rate</th>
                              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">Deals</th>
                              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">Revenue</th>
                              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">Sessions</th>
                              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">Avg Rating</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {analytics.employeeLeaderboard.map((emp, index) => (
                            <tr key={emp.emp_id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                {index === 0 ? (
                                  <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center">
                                    <Crown className="w-4 h-4 text-white" />
                                  </div>
                                ) : index === 1 ? (
                                  <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">2</span>
                                  </div>
                                ) : index === 2 ? (
                                  <div className="w-7 h-7 bg-amber-600 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">3</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500 font-medium ml-2">{index + 1}</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                                  <p className="text-xs text-gray-500">{emp.department || 'No dept'}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-sm font-semibold text-gray-700">{emp.contactsHandled}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-sm font-semibold text-green-600">{emp.conversions}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`text-sm font-semibold ${
                                  emp.conversionRate >= 20 ? 'text-green-600' : 
                                  emp.conversionRate >= 10 ? 'text-amber-600' : 'text-gray-600'
                                }`}>
                                  {emp.conversionRate}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-sm font-semibold text-purple-600">{emp.dealsClosed}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span 
                                  className="text-sm font-bold text-gray-900 cursor-help"
                                  title={formatCurrency(emp.totalRevenue || 0, { compact: false })}
                                >
                                  {formatCompact(emp.totalRevenue || 0)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-sm text-gray-600">{emp.totalSessions}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  <span className="text-sm font-medium text-gray-700">{emp.avgSessionRating}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                      {analytics.employeeLeaderboard.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-8">No employee data available</p>
                      )}
                    </div>
                  </div>

                  {/* Monthly Trends */}
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-sky-500" />
                      Monthly Trends (Last 12 Months)
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Revenue Trend */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Revenue</h4>
                        <div className="space-y-2">
                          {analytics.trends.revenue.slice(-6).map((month) => {
                            const maxRevenue = Math.max(...analytics.trends.revenue.map(m => m.revenue)) || 1;
                            const percentage = (month.revenue / maxRevenue) * 100;
                            return (
                              <div key={month.month} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-16">{month.monthLabel}</span>
                                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 w-14 text-right">
                                  {formatCompact(month.revenue)}
                                </span>
                              </div>
                            );
                          })}
                          {analytics.trends.revenue.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No data</p>
                          )}
                        </div>
                      </div>

                      {/* Leads Trend */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">New Leads</h4>
                        <div className="space-y-2">
                          {analytics.trends.leads.slice(-6).map((month) => {
                            const maxLeads = Math.max(...analytics.trends.leads.map(m => m.leads)) || 1;
                            const percentage = (month.leads / maxLeads) * 100;
                            return (
                              <div key={month.month} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-16">{month.monthLabel}</span>
                                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 w-10 text-right">
                                  {month.leads}
                                </span>
                              </div>
                            );
                          })}
                          {analytics.trends.leads.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No data</p>
                          )}
                        </div>
                      </div>

                      {/* Conversions Trend */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Conversions</h4>
                        <div className="space-y-2">
                          {analytics.trends.conversions.slice(-6).map((month) => {
                            const maxConv = Math.max(...analytics.trends.conversions.map(m => m.conversions)) || 1;
                            const percentage = (month.conversions / maxConv) * 100;
                            return (
                              <div key={month.month} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-16">{month.monthLabel}</span>
                                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 w-10 text-right">
                                  {month.conversions}
                                </span>
                              </div>
                            );
                          })}
                          {analytics.trends.conversions.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No data</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Sources */}
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Award className="w-4 h-4 text-sky-500" />
                      Top Performing Sources (by Revenue)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {analytics.topSources.map((source, index) => (
                        <div 
                          key={source.source} 
                          className={`p-4 rounded-xl border ${
                            index === 0 ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200' :
                            index === 1 ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200' :
                            'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {index === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                            <span className="text-sm font-semibold text-gray-900">{source.source}</span>
                          </div>
                          <p className="text-xl font-bold text-gray-900">
                            {formatCompact(source.revenue)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {source.leads} leads • {source.conversions} conv.
                          </p>
                        </div>
                      ))}
                      {analytics.topSources.length === 0 && (
                        <p className="text-sm text-gray-400 col-span-5 text-center py-4">No source data available</p>
                      )}
                    </div>
                  </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Invite New Employee</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
                {/* Info Banner */}
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-700 flex items-start gap-2">
                  <Send className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">An invitation email will be sent</p>
                    <p className="text-xs mt-1 text-sky-600">The employee will receive an email with a link to join the CRM. They can only sign in using Google with this exact email address.</p>
                  </div>
                </div>
                
                {formErrors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    {formErrors.submit}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      formErrors.name ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="John Doe"
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      formErrors.email ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="john@company.com"
                  />
                  {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
                  <p className="mt-1 text-xs text-gray-500">Must be a Google account email</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <input
                    type="text"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      formErrors.department ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Sales, Marketing, Support..."
                  />
                  {formErrors.department && <p className="mt-1 text-xs text-red-500">{formErrors.department}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
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
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Employee?</h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to remove <span className="font-semibold text-gray-700">{showDeleteConfirm.name}</span>? 
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRemoveEmployee(showDeleteConfirm.emp_id)}
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
      )}

      {/* Employee Detail Sidebar */}
      {selectedEmployee && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40"
            onClick={closeEmployeePanel}
          />
          
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Employee Details</h2>
              <button
                onClick={closeEmployeePanel}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Profile Header */}
              <div className={`px-6 py-8 ${
                selectedEmployee.invitation_status === 'DISABLED'
                  ? 'bg-gradient-to-r from-gray-500 to-gray-600'
                  : selectedEmployee.role === 'ADMIN'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                    : 'bg-gradient-to-r from-sky-500 to-blue-600'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/30">
                    {getInitials(selectedEmployee.name)}
                  </div>
                  <div className="text-white">
                    <h3 className="text-xl font-bold">{selectedEmployee.name}</h3>
                    <p className="text-white/80">{selectedEmployee.department || 'No department'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/20 text-white">
                        {selectedEmployee.role === 'ADMIN' ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Shield className="w-3.5 h-3.5" />
                        )}
                        {selectedEmployee.role}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        selectedEmployee.invitation_status === 'ACTIVE' 
                          ? 'bg-emerald-500/30 text-white' 
                          : selectedEmployee.invitation_status === 'DISABLED'
                            ? 'bg-red-500/30 text-white'
                            : 'bg-amber-500/30 text-white'
                      }`}>
                        {selectedEmployee.invitation_status === 'ACTIVE' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : selectedEmployee.invitation_status === 'DISABLED' ? (
                          <Ban className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {selectedEmployee.invitation_status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedEmployee.contactsHandled || 0}</p>
                  <p className="text-xs text-gray-500">Leads</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{selectedEmployee.dealsClosed || 0}</p>
                  <p className="text-xs text-gray-500">Deals</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{formatCompact(selectedEmployee.totalRevenue || 0)}</p>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-6 border-b border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700">{selectedEmployee.email}</span>
                  </div>
                  {selectedEmployee.phone && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-700">{selectedEmployee.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Actions */}
              <div className="p-6 border-b border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Admin Actions</h4>
                <div className="flex flex-col gap-3">
                  {/* Role Change - Only for ACTIVE employees */}
                  {selectedEmployee.invitation_status === 'ACTIVE' && (
                    <div className="flex gap-3">
                      {selectedEmployee.role === 'EMPLOYEE' ? (
                        <button
                          onClick={() => handleRoleChange(selectedEmployee.emp_id, 'ADMIN')}
                          disabled={actionLoading}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl font-medium text-sm hover:bg-amber-100 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Promote to Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(selectedEmployee.emp_id, 'EMPLOYEE')}
                          disabled={actionLoading || selectedEmployee.emp_id === user?.emp_id}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-50 text-sky-700 rounded-xl font-medium text-sm hover:bg-sky-100 transition-colors disabled:opacity-50"
                        >
                          <Shield className="w-4 h-4" />
                          Demote to Employee
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Resend Invitation - Only for INVITED */}
                  {selectedEmployee.invitation_status === 'INVITED' && (
                    <button
                      onClick={() => handleResendInvitation(selectedEmployee.emp_id)}
                      disabled={inviteLoading === selectedEmployee.emp_id}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-50 text-sky-700 rounded-xl font-medium text-sm hover:bg-sky-100 transition-colors disabled:opacity-50"
                    >
                      {inviteLoading === selectedEmployee.emp_id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Resend Invitation
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Enable/Disable + Remove */}
                  {selectedEmployee.emp_id !== user?.emp_id && (
                    <div className="flex gap-3">
                      {selectedEmployee.invitation_status === 'DISABLED' ? (
                        <button
                          onClick={() => handleToggleStatus(selectedEmployee.emp_id, 'DISABLED')}
                          disabled={actionLoading}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-medium text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          <UserCheck className="w-4 h-4" />
                          Enable Account
                        </button>
                      ) : selectedEmployee.invitation_status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleToggleStatus(selectedEmployee.emp_id, 'ACTIVE')}
                          disabled={actionLoading}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl font-medium text-sm hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          <UserX className="w-4 h-4" />
                          Disable Account
                        </button>
                      ) : null}
                      <button
                        onClick={() => setShowDeleteConfirm(selectedEmployee)}
                        disabled={actionLoading}
                        className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activities */}
              <div className="p-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Recent Activities</h4>
                
                {activitiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
                  </div>
                ) : employeeActivities.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No recent activities</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employeeActivities.slice(0, 10).map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="mt-0.5">
                          {getStatusIcon(activity.session_status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.contact_name || 'Unknown Contact'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.mode_of_contact} • {formatTimeAgo(activity.created_at)}
                          </p>
                          {activity.remarks && (
                            <p className="text-xs text-gray-600 mt-1 bg-white rounded p-2">
                              {activity.remarks}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-medium text-gray-600">{activity.rating}/10</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Contact Detail Sidebar */}
      {selectedContact && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedContact(null)}
          />
          <ContactDetail
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
            onUpdate={handleUpdateContact}
            onFollowupsClick={handleFollowupsClick}
            onEmailClick={(contact) => setEmailContact(contact)}
          />
        </>
      )}

      {/* Email Compose Modal */}
      <EmailComposer
        isOpen={!!emailContact}
        contact={emailContact}
        onClose={() => setEmailContact(null)}
        onSuccess={() => {
          fetchContacts();
        }}
      />

      {/* CSS Animation */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
