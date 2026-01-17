import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Grid3X3, List, MessageSquare } from 'lucide-react';
import ContactCard from './ContactCard';
import ContactTable from './ContactTable';

const ContactGrid = ({ 
  contacts = [], 
  onContactSelect, 
  onEmailClick, 
  onFollowupsClick,
  onAddContact,
  loading = false,
  activeStage = 'LEAD'
}) => {
  const navigate = useNavigate();
  const [activeTemperature, setActiveTemperature] = useState('COLD');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table');

  // Filter contacts by temperature and search
  useEffect(() => {
    let filtered = contacts.filter(
      (contact) => contact.temperature === activeTemperature
    );
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.phone?.includes(query)
      );
    }
    
    setFilteredContacts(filtered);
  }, [contacts, activeTemperature, searchQuery]);

  const temperatures = [
    { 
      value: 'HOT', 
      label: 'Hot', 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      activeColor: 'bg-red-500 text-white border-red-500',
      count: contacts.filter(c => c.temperature === 'HOT').length
    },
    { 
      value: 'WARM', 
      label: 'Warm', 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      activeColor: 'bg-orange-500 text-white border-orange-500',
      count: contacts.filter(c => c.temperature === 'WARM').length
    },
    { 
      value: 'COLD', 
      label: 'Cold', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      activeColor: 'bg-blue-500 text-white border-blue-500',
      count: contacts.filter(c => c.temperature === 'COLD').length
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        {/* Top Row - Title and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Pipeline
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {contacts.length} total contacts • {filteredContacts.length} in {activeTemperature.toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onAddContact}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30"
            >
              <Plus className="w-5 h-5" />
              <span>Add Lead</span>
            </button>
            <button
              onClick={() => navigate(`/${activeStage.toLowerCase()}/followups`)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Sessions</span>
            </button>
          </div>
        </div>

        {/* Temperature Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          {temperatures.map((temp) => (
            <button
              key={temp.value}
              onClick={() => setActiveTemperature(temp.value)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${
                activeTemperature === temp.value
                  ? temp.activeColor
                  : `${temp.bgColor} ${temp.color} ${temp.borderColor} hover:shadow-sm`
              }`}
            >
              <span>{temp.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTemperature === temp.value
                  ? 'bg-white/20'
                  : 'bg-white'
              }`}>
                {temp.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white shadow-sm text-sky-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Grid View"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'table' 
                  ? 'bg-white shadow-sm text-sky-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Table View (Sortable)"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-sky-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-sky-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-500 font-medium">Loading contacts...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredContacts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No {activeTemperature.toLowerCase()} contacts
          </h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            {searchQuery 
              ? `No contacts match "${searchQuery}". Try a different search term.`
              : `Start building your pipeline by adding your first ${activeTemperature.toLowerCase()} lead.`
            }
          </p>
          {!searchQuery && (
            <button
              onClick={onAddContact}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/25"
            >
              <Plus className="w-5 h-5" />
              Add Your First Lead
            </button>
          )}
        </div>
      )}

      {/* Contact Grid/List/Table */}
      {!loading && filteredContacts.length > 0 && (
        viewMode === 'table' ? (
          <ContactTable
            contacts={filteredContacts}
            onContactSelect={onContactSelect}
            onEmailClick={onEmailClick}
            onFollowupsClick={onFollowupsClick}
          />
        ) : (
          <div className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5' 
              : 'flex flex-col gap-3'
          }`}>
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.contact_id}
                contact={contact}
                onSelect={onContactSelect}
                onEmailClick={onEmailClick}
                onFollowupsClick={onFollowupsClick}
                viewMode={viewMode}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default ContactGrid;