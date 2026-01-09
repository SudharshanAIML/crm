import { memo } from 'react';
import { Search, ChevronDown, Eye, ArrowRight, Contact } from 'lucide-react';
import { Pagination, SortIcon, getContactStatusBadge, getTemperatureIcon } from '../index';
import { ContactsTable } from '../../contacts';

/**
 * Utility function to get initials from name
 */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Utility function to format time ago
 */
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

/**
 * ContactRow - Memoized row component for contacts table
 */
const ContactRow = memo(({ contact, onView, onFollowups }) => (
  <tr className="hover:bg-gray-50 transition-colors">
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
          onClick={() => onView(contact)}
          className="p-2 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onFollowups(contact)}
          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          title="Go to Followups"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </td>
  </tr>
));

ContactRow.displayName = 'ContactRow';

/**
 * SortableHeader - Memoized sortable table header
 */
const SortableHeader = memo(({ column, label, currentSort, onSort, align = 'left' }) => (
  <th 
    onClick={() => onSort(column)}
    className={`text-${align} py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group`}
  >
    <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : ''}`}>
      {label}
      <SortIcon column={column} currentSort={currentSort} />
    </div>
  </th>
));

SortableHeader.displayName = 'SortableHeader';

/**
 * ContactsTab - Contacts management tab with search, filters, and contacts table
 * Memoized to prevent unnecessary re-renders
 */
const ContactsTab = memo(({
  // Filter state
  contactSearchQuery,
  setContactSearchQuery,
  filterContactStatus,
  setFilterContactStatus,
  filterTemperature,
  setFilterTemperature,
  filterAssignedEmp,
  setFilterAssignedEmp,
  // Data
  contactStatuses,
  temperatures,
  employees,
  // Table data
  contactsLoading,
  filteredSortedContacts,
  paginatedContacts,
  contactSort,
  contactPage,
  contactTotalPages,
  setContactPage,
  ROWS_PER_PAGE,
  // Handlers
  handleContactSort,
  handleViewContact,
  handleFollowupsClick
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Filter Bar */}
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
      <ContactsTable 
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
        getInitials={getInitials}
        formatTimeAgo={formatTimeAgo}
      />
    </div>
  );
});

ContactsTab.displayName = 'ContactsTab';

export default ContactsTab;
