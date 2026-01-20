import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Phone, Mail, Users, Video, Star, Search,
  Clock, Calendar, ChevronDown, ChevronUp, MessageSquare,
  FileText, CheckCircle2, XCircle, AlertCircle, Filter,
  ArrowUpDown, User, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { getAllSessionsByStage } from '../services/sessionService';

/** Rows per page for pagination */
const PAGE_SIZE = 20;

// Stage configuration with colors and labels
const STAGE_CONFIG = {
  LEAD: { label: 'Lead', color: 'bg-gray-500', lightColor: 'bg-gray-100 text-gray-700', gradient: 'from-gray-500 to-gray-600' },
  MQL: { label: 'MQL', color: 'bg-blue-500', lightColor: 'bg-blue-100 text-blue-700', gradient: 'from-blue-500 to-blue-600' },
  SQL: { label: 'SQL', color: 'bg-purple-500', lightColor: 'bg-purple-100 text-purple-700', gradient: 'from-purple-500 to-purple-600' },
  OPPORTUNITY: { label: 'Opportunity', color: 'bg-amber-500', lightColor: 'bg-amber-100 text-amber-700', gradient: 'from-amber-500 to-amber-600' },
  CUSTOMER: { label: 'Customer', color: 'bg-emerald-500', lightColor: 'bg-emerald-100 text-emerald-700', gradient: 'from-emerald-500 to-emerald-600' },
  EVANGELIST: { label: 'Evangelist', color: 'bg-pink-500', lightColor: 'bg-pink-100 text-pink-700', gradient: 'from-pink-500 to-pink-600' }
};

// Status badge component
const StatusBadge = memo(({ status }) => {
  const config = {
    CONNECTED: { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    NOT_CONNECTED: { icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200' },
    BAD_TIMING: { icon: AlertCircle, className: 'bg-amber-100 text-amber-700 border-amber-200' }
  };
  const { icon: Icon, className } = config[status] || config.NOT_CONNECTED;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {status?.replace('_', ' ') || 'Unknown'}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

// Mode icon component
const ModeIcon = memo(({ mode }) => {
  const icons = {
    CALL: Phone,
    EMAIL: Mail,
    MEETING: Users,
    DEMO: Video,
    NOTE: FileText
  };
  const Icon = icons[mode] || MessageSquare;
  return <Icon className="w-4 h-4" />;
});
ModeIcon.displayName = 'ModeIcon';

// Star rating component
const StarRating = memo(({ rating }) => {
  const starCount = rating ? Math.round((rating / 10) * 5) : 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${star <= starCount ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
      <span className="ml-1.5 text-xs text-gray-500">{rating || 0}/10</span>
    </div>
  );
});
StarRating.displayName = 'StarRating';

// Temperature badge
const TemperatureBadge = memo(({ temperature }) => {
  const styles = {
    HOT: 'bg-red-100 text-red-700 border-red-200',
    WARM: 'bg-orange-100 text-orange-700 border-orange-200',
    COLD: 'bg-blue-100 text-blue-700 border-blue-200'
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${styles[temperature] || styles.COLD}`}>
      {temperature || 'COLD'}
    </span>
  );
});
TemperatureBadge.displayName = 'TemperatureBadge';

// Sortable header component
const SortableHeader = memo(({ label, column, currentSort, onSort, className = '' }) => (
  <th
    onClick={() => onSort(column)}
    className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group ${className}`}
  >
    <div className="flex items-center gap-1">
      {label}
      {currentSort.column === column ? (
        currentSort.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-sky-600" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-600" />
      ) : (
        <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  </th>
));
SortableHeader.displayName = 'SortableHeader';

// Session row component
const SessionRow = memo(({ session, onContactClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <tr className="hover:bg-sky-50/50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3">
        <button
          onClick={() => onContactClick(session.contact_id)}
          className="font-medium text-gray-900 hover:text-sky-600 transition-colors text-left"
        >
          {session.contact_name || 'Unknown'}
        </button>
        <p className="text-xs text-gray-500 truncate max-w-[200px]">{session.contact_email}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-gray-600">
          <ModeIcon mode={session.mode_of_contact} />
          <span className="text-sm">{session.mode_of_contact || 'CALL'}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={session.session_status} />
      </td>
      <td className="px-4 py-3">
        <StarRating rating={session.rating} />
      </td>
      <td className="px-4 py-3">
        <TemperatureBadge temperature={session.contact_temperature} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-sm">{formatDate(session.created_at)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-sm">{formatTime(session.created_at)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">{session.employee_name || '—'}</span>
      </td>
    </tr>
  );
});
SessionRow.displayName = 'SessionRow';

const StageFollowupsPage = () => {
  const { stage } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const normalizedStage = stage?.toUpperCase();
  const stageConfig = STAGE_CONFIG[normalizedStage] || STAGE_CONFIG.LEAD;
  
  const backPath = isAdmin ? '/admin' : '/dashboard';

  // State
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ column: 'created_at', direction: 'desc' });
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!normalizedStage || !STAGE_CONFIG[normalizedStage]) {
      setError('Invalid stage');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSessionsByStage(normalizedStage);
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [normalizedStage]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Handlers
  const handleSort = useCallback((column) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleContactClick = useCallback((contactId) => {
    navigate(`/followups/${contactId}`);
  }, [navigate]);

  // Filtered and sorted sessions
  const filteredSortedSessions = useMemo(() => {
    let filtered = sessions.filter(session => {
      const matchesSearch = !searchQuery || 
        session.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.employee_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || session.session_status === statusFilter;
      const matchesMode = modeFilter === 'all' || session.mode_of_contact === modeFilter;
      return matchesSearch && matchesStatus && matchesMode;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.column] ?? '';
      let bVal = b[sortConfig.column] ?? '';

      if (sortConfig.column === 'created_at') {
        aVal = new Date(aVal).getTime() || 0;
        bVal = new Date(bVal).getTime() || 0;
      } else if (sortConfig.column === 'rating') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sessions, searchQuery, statusFilter, modeFilter, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSortedSessions.length / PAGE_SIZE);
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredSortedSessions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredSortedSessions, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, modeFilter]);

  // Stats
  const stats = useMemo(() => {
    const connected = sessions.filter(s => s.session_status === 'CONNECTED').length;
    const avgRating = sessions.length > 0 
      ? (sessions.reduce((sum, s) => sum + (s.rating || 0), 0) / sessions.filter(s => s.rating).length || 0).toFixed(1)
      : 0;
    return { total: sessions.length, connected, avgRating };
  }, [sessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <button onClick={fetchSessions} className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${stageConfig.gradient} text-white`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(backPath)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{stageConfig.label} Follow-ups</h1>
                <p className="text-white/80 text-sm mt-1">
                  All sessions logged at the {stageConfig.label} stage
                </p>
              </div>
            </div>
            <button
              onClick={fetchSessions}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm">Total Sessions</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm">Connected</p>
              <p className="text-2xl font-bold">{stats.connected}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm">Avg Rating</p>
              <p className="text-2xl font-bold">{stats.avgRating}/10</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts, employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="CONNECTED">Connected</option>
                <option value="NOT_CONNECTED">Not Connected</option>
                <option value="BAD_TIMING">Bad Timing</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Mode Filter */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="all">All Modes</option>
                <option value="CALL">Call</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Meeting</option>
                <option value="DEMO">Demo</option>
                <option value="NOTE">Note</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <span className="text-sm text-gray-500">
              {filteredSortedSessions.length} of {sessions.length} sessions
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Contact" column="contact_name" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Mode" column="mode_of_contact" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Status" column="session_status" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Rating" column="rating" currentSort={sortConfig} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Temperature
                  </th>
                  <SortableHeader label="Date" column="created_at" currentSort={sortConfig} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Time
                  </th>
                  <SortableHeader label="Employee" column="employee_name" currentSort={sortConfig} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {paginatedSessions.map((session) => (
                  <SessionRow 
                    key={session.session_id} 
                    session={session} 
                    onContactClick={handleContactClick}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                <span className="font-semibold text-gray-900">{Math.min(currentPage * PAGE_SIZE, filteredSortedSessions.length)}</span> of{' '}
                <span className="font-semibold text-gray-900">{filteredSortedSessions.length}</span> sessions
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="First page"><ChevronsLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Previous"><ChevronLeft className="w-4 h-4" /></button>
                <div className="flex items-center gap-1 mx-2">
                  {(() => {
                    const pages = [];
                    let start = Math.max(1, currentPage - 2);
                    let end = Math.min(totalPages, start + 4);
                    if (end - start < 4) start = Math.max(1, end - 4);
                    
                    if (start > 1) {
                      pages.push(<button key={1} onClick={() => setCurrentPage(1)} className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">1</button>);
                      if (start > 2) pages.push(<span key="start-ellipsis" className="px-1 text-gray-400">...</span>);
                    }
                    for (let i = start; i <= end; i++) {
                      pages.push(
                        <button key={i} onClick={() => setCurrentPage(i)} className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${currentPage === i ? 'bg-sky-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>{i}</button>
                      );
                    }
                    if (end < totalPages) {
                      if (end < totalPages - 1) pages.push(<span key="end-ellipsis" className="px-1 text-gray-400">...</span>);
                      pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">{totalPages}</button>);
                    }
                    return pages;
                  })()}
                </div>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Next"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Last page"><ChevronsRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {filteredSortedSessions.length === 0 && (
            <div className="py-16 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No sessions found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery || statusFilter !== 'all' || modeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : `No sessions have been logged at the ${stageConfig.label} stage yet`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StageFollowupsPage;
