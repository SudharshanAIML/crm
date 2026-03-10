import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Search, Users, CheckSquare, Square, Loader2, AlertCircle, UserCheck } from 'lucide-react';
import { getContacts } from '../../services/contactService';
import { enrollContacts } from '../../services/sequenceService';

const STAGE_OPTIONS = [
  { value: '', label: 'All Stages' },
  { value: 'LEAD',        label: 'Lead' },
  { value: 'MQL',         label: 'MQL' },
  { value: 'SQL',         label: 'SQL' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'CUSTOMER',    label: 'Customer' },
  { value: 'EVANGELIST',  label: 'Evangelist' },
];

const STAGE_COLOR = {
  LEAD:        'bg-gray-100 text-gray-600',
  MQL:         'bg-blue-100 text-blue-700',
  SQL:         'bg-purple-100 text-purple-700',
  OPPORTUNITY: 'bg-orange-100 text-orange-700',
  CUSTOMER:    'bg-green-100 text-green-700',
  EVANGELIST:  'bg-yellow-100 text-yellow-700',
  DORMANT:     'bg-red-100 text-red-600',
};

export default function EnrollContactsModal({ sequence, onClose, onEnrolled }) {
  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);
  const [search, setSearch]       = useState('');
  const [stage, setStage]         = useState('');
  const [selected, setSelected]   = useState(new Set());

  // Load contacts
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getContacts({ status: stage || undefined, limit: 200 });
        setContacts(Array.isArray(data) ? data : data.contacts || []);
      } catch (e) {
        setError('Failed to load contacts');
      } finally {
        setLoading(false);
      }
    })();
  }, [stage]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const toggleContact = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.contact_id)));
    }
  };

  const handleEnroll = async () => {
    if (!selected.size) return;
    setError(null);
    setSuccess(null);
    try {
      setEnrolling(true);
      const result = await enrollContacts(sequence.sequence_id, [...selected]);
      const { enrolled = [], skipped = [] } = result;
      setSuccess(`Enrolled ${enrolled.length} contact${enrolled.length !== 1 ? 's' : ''}${skipped.length ? ` (${skipped.length} skipped — already enrolled or not found)` : ''}.`);
      setSelected(new Set());
      // Notify parent so it can refresh sequence stats
      if (enrolled.length > 0 && onEnrolled) {
        setTimeout(() => onEnrolled(result), 1200);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to enroll contacts');
    } finally {
      setEnrolling(false);
    }
  };

  const allChecked = filtered.length > 0 && selected.size === filtered.length;
  const someChecked = selected.size > 0 && selected.size < filtered.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-sky-500" />
              Enroll Contacts
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Sequence: <span className="font-medium text-gray-700">{sequence.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white"
          >
            {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Alerts */}
        <div className="px-6">
          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Select all bar */}
        <div className="px-6 py-2 flex items-center gap-2">
          <button type="button" onClick={toggleAll} className="flex items-center gap-2 text-sm text-gray-600 hover:text-sky-600">
            {allChecked   ? <CheckSquare className="w-4 h-4 text-sky-500" /> :
             someChecked  ? <CheckSquare className="w-4 h-4 text-gray-400" /> :
                            <Square      className="w-4 h-4 text-gray-400" />}
            {allChecked ? 'Deselect all' : 'Select all'}
          </button>
          {selected.size > 0 && (
            <span className="text-xs text-sky-600 font-medium ml-auto">{selected.size} selected</span>
          )}
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              {search ? 'No contacts match your search' : 'No contacts found'}
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((c) => {
                const checked = selected.has(c.contact_id);
                return (
                  <li key={c.contact_id}>
                    <button
                      type="button"
                      onClick={() => toggleContact(c.contact_id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        checked
                          ? 'bg-sky-50 border-sky-200'
                          : 'bg-white border-transparent hover:bg-gray-50'
                      }`}
                    >
                      {checked
                        ? <CheckSquare className="w-4 h-4 text-sky-500 flex-shrink-0" />
                        : <Square      className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">{c.email}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${STAGE_COLOR[c.status] || STAGE_COLOR.LEAD}`}>
                        {c.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            {filtered.length} contact{filtered.length !== 1 ? 's' : ''} shown
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Close
            </button>
            <button
              onClick={handleEnroll}
              disabled={!selected.size || enrolling}
              className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Enroll {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
