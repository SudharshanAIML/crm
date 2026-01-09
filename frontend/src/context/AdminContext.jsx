import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { getTeamWithStatus, getEmployeeActivities } from '../services/employeeService';
import { getAllContactsAdmin } from '../services/contactService';
import { getAdminAnalytics } from '../services/analyticsService';

const AdminContext = createContext(null);

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export const AdminProvider = ({ children }) => {
  // Employees state
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const employeesCacheTime = useRef(0);

  // Contacts state
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const contactsCacheTime = useRef(0);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const analyticsCacheTime = useRef(0);

  // Employee activities cache (keyed by emp_id)
  const [activitiesCache, setActivitiesCache] = useState({});
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Check if cache is valid
  const isCacheValid = useCallback((cacheTime) => {
    return Date.now() - cacheTime < CACHE_DURATION;
  }, []);

  // Fetch employees with caching
  const fetchEmployees = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && employees.length > 0 && isCacheValid(employeesCacheTime.current)) {
      return employees;
    }

    try {
      setEmployeesLoading(true);
      const data = await getTeamWithStatus();
      setEmployees(data || []);
      employeesCacheTime.current = Date.now();
      return data || [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    } finally {
      setEmployeesLoading(false);
    }
  }, [employees, isCacheValid]);

  // Fetch contacts with caching
  const fetchContacts = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && contacts.length > 0 && isCacheValid(contactsCacheTime.current)) {
      return contacts;
    }

    try {
      setContactsLoading(true);
      const data = await getAllContactsAdmin({ limit: 200 });
      setContacts(data || []);
      contactsCacheTime.current = Date.now();
      return data || [];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    } finally {
      setContactsLoading(false);
    }
  }, [contacts, isCacheValid]);

  // Fetch analytics with caching
  const fetchAnalytics = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && analytics && isCacheValid(analyticsCacheTime.current)) {
      return analytics;
    }

    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const data = await getAdminAnalytics();
      setAnalytics(data);
      analyticsCacheTime.current = Date.now();
      return data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalyticsError('Failed to load analytics data');
      return null;
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analytics, isCacheValid]);

  // Fetch employee activities with caching
  const fetchEmployeeActivities = useCallback(async (empId, forceRefresh = false) => {
    if (!forceRefresh && activitiesCache[empId]) {
      return activitiesCache[empId];
    }

    try {
      setActivitiesLoading(true);
      const data = await getEmployeeActivities(empId);
      setActivitiesCache(prev => ({ ...prev, [empId]: data || [] }));
      return data || [];
    } catch (error) {
      console.error('Error fetching employee activities:', error);
      return [];
    } finally {
      setActivitiesLoading(false);
    }
  }, [activitiesCache]);

  // Update local employee data (after add/remove/update)
  const updateEmployees = useCallback((updater) => {
    if (typeof updater === 'function') {
      setEmployees(updater);
    } else {
      setEmployees(updater);
    }
    employeesCacheTime.current = Date.now();
  }, []);

  // Update local contacts data
  const updateContacts = useCallback((updater) => {
    if (typeof updater === 'function') {
      setContacts(updater);
    } else {
      setContacts(updater);
    }
    contactsCacheTime.current = Date.now();
  }, []);

  // Invalidate specific cache
  const invalidateCache = useCallback((type) => {
    switch (type) {
      case 'employees':
        employeesCacheTime.current = 0;
        break;
      case 'contacts':
        contactsCacheTime.current = 0;
        break;
      case 'analytics':
        analyticsCacheTime.current = 0;
        break;
      case 'activities':
        setActivitiesCache({});
        break;
      case 'all':
        employeesCacheTime.current = 0;
        contactsCacheTime.current = 0;
        analyticsCacheTime.current = 0;
        setActivitiesCache({});
        break;
      default:
        break;
    }
  }, []);

  // Computed stats from employees (memoized)
  const employeeStats = useMemo(() => {
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

  // Departments list (memoized)
  const departments = useMemo(() =>
    [...new Set(employees.map(e => e.department).filter(Boolean))].sort((a, b) => {
      if (a.toLowerCase() === 'other') return 1;
      if (b.toLowerCase() === 'other') return -1;
      return a.localeCompare(b);
    }), [employees]
  );

  const value = useMemo(() => ({
    // Employees
    employees,
    employeesLoading,
    fetchEmployees,
    updateEmployees,
    employeeStats,
    departments,
    
    // Employee activities
    activitiesCache,
    activitiesLoading,
    fetchEmployeeActivities,
    
    // Contacts
    contacts,
    contactsLoading,
    fetchContacts,
    updateContacts,
    
    // Analytics
    analytics,
    analyticsLoading,
    analyticsError,
    fetchAnalytics,
    
    // Cache management
    invalidateCache
  }), [
    employees, employeesLoading, fetchEmployees, updateEmployees, employeeStats, departments,
    activitiesCache, activitiesLoading, fetchEmployeeActivities,
    contacts, contactsLoading, fetchContacts, updateContacts,
    analytics, analyticsLoading, analyticsError, fetchAnalytics,
    invalidateCache
  ]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export default AdminContext;
