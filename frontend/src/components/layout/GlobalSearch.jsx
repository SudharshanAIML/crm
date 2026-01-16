import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, Mail, Phone, Loader2 } from 'lucide-react';
import { searchContacts } from '../../services/contactService';

/**
 * Stage configuration with colors and labels
 */
const STAGE_CONFIG = {
  LEAD: { label: 'Lead', color: 'bg-gray-100 text-gray-700', slug: 'lead' },
  MQL: { label: 'MQL', color: 'bg-blue-100 text-blue-700', slug: 'mql' },
  SQL: { label: 'SQL', color: 'bg-purple-100 text-purple-700', slug: 'sql' },
  OPPORTUNITY: { label: 'Opportunity', color: 'bg-amber-100 text-amber-700', slug: 'opportunity' },
  CUSTOMER: { label: 'Customer', color: 'bg-green-100 text-green-700', slug: 'customer' },
  EVANGELIST: { label: 'Evangelist', color: 'bg-pink-100 text-pink-700', slug: 'evangelist' },
  DORMANT: { label: 'Dormant', color: 'bg-slate-100 text-slate-700', slug: 'dormant' },
};

/**
 * Temperature badge colors
 */
const TEMP_COLORS = {
  HOT: 'bg-red-500',
  WARM: 'bg-orange-500',
  COLD: 'bg-blue-500',
};

/**
 * Debounce hook for search input
 */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Search result item component
 */
const SearchResultItem = memo(({ contact, onSelect, isHighlighted }) => {
  const stageConfig = STAGE_CONFIG[contact.status] || STAGE_CONFIG.LEAD;
  const tempColor = TEMP_COLORS[contact.temperature] || TEMP_COLORS.COLD;

  return (
    <button
      onClick={() => onSelect(contact)}
      className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
        isHighlighted ? 'bg-sky-50' : 'hover:bg-gray-50'
      }`}
    >
      {/* Avatar with temperature indicator */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-medium">
          {contact.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${tempColor}`} />
      </div>

      {/* Contact info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">{contact.name}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageConfig.color}`}>
            {stageConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          {contact.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="w-3.5 h-3.5" />
              {contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              {contact.phone}
            </span>
          )}
        </div>
        {contact.job_title && (
          <span className="text-xs text-gray-400 mt-0.5 block">{contact.job_title}</span>
        )}
      </div>
    </button>
  );
});

SearchResultItem.displayName = 'SearchResultItem';

/**
 * Global Search Component - searches contacts across all pipeline stages
 */
const GlobalSearch = memo(({ className = '' }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await searchContacts(debouncedQuery);
        setResults(data);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && results[highlightedIndex]) {
            handleSelectContact(results[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, highlightedIndex]
  );

  // Handle contact selection - navigate to their stage
  const handleSelectContact = useCallback(
    (contact) => {
      const stageConfig = STAGE_CONFIG[contact.status] || STAGE_CONFIG.LEAD;
      // Navigate to the contact's stage with their temperature
      navigate(`/contacts/${stageConfig.slug}`, {
        state: { highlightContactId: contact.contact_id },
      });
      setQuery('');
      setIsOpen(false);
      setResults([]);
    },
    [navigate]
  );

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search all contacts..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-[400px] overflow-y-auto"
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {results.map((contact, index) => (
                <SearchResultItem
                  key={contact.contact_id}
                  contact={contact}
                  onSelect={handleSelectContact}
                  isHighlighted={index === highlightedIndex}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <User className="w-10 h-10 mb-2 opacity-50" />
              <span className="text-sm">No contacts found for "{query}"</span>
              <span className="text-xs mt-1">Try a different name, email, or phone</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

GlobalSearch.displayName = 'GlobalSearch';

export default GlobalSearch;
