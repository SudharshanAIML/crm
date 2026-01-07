import { useState } from 'react';
import { ChevronUp, ChevronDown, Mail, Star, MessageSquare } from 'lucide-react';

const ContactTable = ({ contacts = [], onContactSelect, onEmailClick, onFollowupsClick }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Sortable columns configuration
  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone', sortable: true },
    { key: 'company_name', label: 'Company', sortable: true },
    { key: 'temperature', label: 'Temperature', sortable: true },
    { key: 'average_rating', label: 'Rating', sortable: true },
    { key: 'created_at', label: 'Created', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false },
  ];

  // Handle sorting
  const handleSort = (key) => {
    if (!columns.find(col => col.key === key)?.sortable) return;
    
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sort contacts
  const sortedContacts = [...contacts].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle null/undefined values
    if (aValue == null) aValue = '';
    if (bValue == null) bValue = '';

    // Handle numeric sorting for rating
    if (sortConfig.key === 'average_rating') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    // Handle date sorting
    if (sortConfig.key === 'created_at') {
      aValue = new Date(aValue).getTime() || 0;
      bValue = new Date(bValue).getTime() || 0;
    }

    // String comparison for other fields
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Get temperature badge styling
  const getTemperatureBadge = (temp) => {
    const styles = {
      HOT: 'bg-red-100 text-red-700 border-red-200',
      WARM: 'bg-orange-100 text-orange-700 border-orange-200',
      COLD: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return styles[temp] || styles.COLD;
  };

  // Render star rating
  const renderStars = (rating) => {
    const starRating = rating ? Math.round((rating / 10) * 5) : 0;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= starRating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  // Render sort indicator
  const SortIndicator = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <span className="ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronUp className="w-3 h-3" />
        </span>
      );
    }
    return (
      <span className="ml-1 text-sky-600">
        {sortConfig.direction === 'asc' ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 group select-none' : ''
                  }`}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && <SortIndicator columnKey={column.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedContacts.map((contact) => (
              <tr
                key={contact.contact_id}
                onClick={() => onContactSelect(contact)}
                className="hover:bg-sky-50/50 cursor-pointer transition-colors"
              >
                {/* Name with Avatar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {contact.profile_picture ? (
                        <img
                          src={contact.profile_picture}
                          alt={contact.name}
                          className="w-9 h-9 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className={contact.profile_picture ? 'hidden' : ''}>
                        {getInitials(contact.name)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 truncate max-w-[200px]">
                      {contact.name || '—'}
                    </span>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3">
                  <span className="text-gray-600 text-sm truncate max-w-[200px] block">
                    {contact.email || '—'}
                  </span>
                </td>

                {/* Phone */}
                <td className="px-4 py-3">
                  <span className="text-gray-600 text-sm">
                    {contact.phone || '—'}
                  </span>
                </td>

                {/* Company */}
                <td className="px-4 py-3">
                  <span className="text-gray-600 text-sm truncate max-w-[150px] block">
                    {contact.company_name || '—'}
                  </span>
                </td>

                {/* Temperature */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getTemperatureBadge(
                      contact.temperature
                    )}`}
                  >
                    {contact.temperature || 'COLD'}
                  </span>
                </td>

                {/* Rating */}
                <td className="px-4 py-3">
                  {renderStars(contact.average_rating)}
                </td>

                {/* Created Date */}
                <td className="px-4 py-3">
                  <span className="text-gray-500 text-sm">
                    {formatDate(contact.created_at)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmailClick?.(contact);
                      }}
                      className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      title="Send Email"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFollowupsClick?.(contact);
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Follow-ups"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {sortedContacts.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500">No contacts to display</p>
        </div>
      )}
    </div>
  );
};

export default ContactTable;
