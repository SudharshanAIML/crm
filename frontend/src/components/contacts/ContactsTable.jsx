import { memo } from 'react';
import { Eye, ArrowRight, Contact } from 'lucide-react';
import { Pagination, SortIcon, getContactStatusBadge, getTemperatureIcon } from '../admin';

/**
 * ContactsTable - Displays paginated, sortable contacts with filters
 * Memoized for performance - only re-renders when props change
 */
const ContactsTable = memo(({
  contactsLoading,
  filteredSortedContacts,
  paginatedContacts,
  contactSort,
  contactPage,
  contactTotalPages,
  setContactPage,
  ROWS_PER_PAGE,
  handleContactSort,
  handleViewContact,
  handleFollowupsClick,
  getInitials,
  formatTimeAgo
}) => {
  if (contactsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (filteredSortedContacts.length === 0) {
    return (
      <div className="text-center py-12">
        <Contact className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No contacts found</p>
      </div>
    );
  }

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <SortableHeader 
              column="name" 
              label="Contact" 
              currentSort={contactSort} 
              onSort={handleContactSort} 
            />
            <SortableHeader 
              column="status" 
              label="Status" 
              currentSort={contactSort} 
              onSort={handleContactSort} 
            />
            <SortableHeader 
              column="temperature" 
              label="Temp" 
              currentSort={contactSort} 
              onSort={handleContactSort}
              centered 
            />
            <SortableHeader 
              column="assigned_emp_name" 
              label="Assigned To" 
              currentSort={contactSort} 
              onSort={handleContactSort} 
            />
            <SortableHeader 
              column="total_sessions" 
              label="Sessions" 
              currentSort={contactSort} 
              onSort={handleContactSort}
              centered 
            />
            <SortableHeader 
              column="last_contacted" 
              label="Last Contact" 
              currentSort={contactSort} 
              onSort={handleContactSort} 
            />
            <th className="text-center py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedContacts.map((contact) => (
            <ContactRow
              key={contact.contact_id}
              contact={contact}
              getInitials={getInitials}
              formatTimeAgo={formatTimeAgo}
              onView={handleViewContact}
              onFollowups={handleFollowupsClick}
            />
          ))}
        </tbody>
      </table>

      <Pagination
        currentPage={contactPage}
        totalPages={contactTotalPages}
        totalItems={filteredSortedContacts.length}
        onPageChange={setContactPage}
        itemName="contacts"
        ROWS_PER_PAGE={ROWS_PER_PAGE}
      />
    </>
  );
});

/**
 * SortableHeader - Reusable sortable table header
 */
const SortableHeader = memo(({ column, label, currentSort, onSort, centered = false }) => (
  <th
    onClick={() => onSort(column)}
    className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
  >
    <div className={`flex items-center gap-1.5 ${centered ? 'justify-center' : ''}`}>
      {label}
      <SortIcon column={column} currentSort={currentSort} />
    </div>
  </th>
));

/**
 * ContactRow - Individual contact row component
 * Memoized to prevent unnecessary re-renders
 */
const ContactRow = memo(({ contact, getInitials, formatTimeAgo, onView, onFollowups }) => {
  const temperatureGradient = {
    HOT: 'bg-gradient-to-br from-red-400 to-orange-500',
    WARM: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    COLD: 'bg-gradient-to-br from-sky-400 to-blue-500'
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
            temperatureGradient[contact.temperature] || temperatureGradient.COLD
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
  );
});

ContactsTable.displayName = 'ContactsTable';
SortableHeader.displayName = 'SortableHeader';
ContactRow.displayName = 'ContactRow';

export default ContactsTable;