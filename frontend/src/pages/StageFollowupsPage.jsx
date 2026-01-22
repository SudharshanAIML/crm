import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSessionsCache } from '../context/SessionsCacheContext';
import {
  Phone, Mail, Users, Video, Star, Search,
  Clock, Calendar, ChevronDown, ChevronUp, MessageSquare,
  FileText, CheckCircle2, XCircle, AlertCircle, Filter,
  ArrowUpDown, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, TrendingUp, Zap, Activity
} from 'lucide-react';
import { getAllSessionsByStage } from '../services/sessionService';

/** Rows per page for pagination */
const PAGE_SIZE = 20;

// Stage configuration with muted, sophisticated colors
const STAGE_CONFIG = {
  LEAD: { label: 'Lead', color: 'bg-slate-500', lightBg: 'bg-slate-50', accent: 'text-slate-600', gradient: 'from-slate-500 to-slate-600', border: 'border-slate-200' },
  MQL: { label: 'MQL', color: 'bg-sky-500', lightBg: 'bg-sky-50', accent: 'text-sky-600', gradient: 'from-sky-500 to-sky-600', border: 'border-sky-200' },
  SQL: { label: 'SQL', color: 'bg-violet-500', lightBg: 'bg-violet-50', accent: 'text-violet-600', gradient: 'from-violet-500 to-violet-600', border: 'border-violet-200' },
  OPPORTUNITY: { label: 'Opportunity', color: 'bg-amber-500', lightBg: 'bg-amber-50', accent: 'text-amber-600', gradient: 'from-amber-500 to-orange-500', border: 'border-amber-200' },
  CUSTOMER: { label: 'Customer', color: 'bg-emerald-500', lightBg: 'bg-emerald-50', accent: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-500', border: 'border-emerald-200' },
  EVANGELIST: { label: 'Evangelist', color: 'bg-rose-500', lightBg: 'bg-rose-50', accent: 'text-rose-600', gradient: 'from-rose-500 to-pink-500', border: 'border-rose-200' }
};

// Status badge component
const StatusBadge = memo(({ status }) => {
  const config = {
    CONNECTED: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-600 border-emerald-200/60' },
    NOT_CONNECTED: { icon: XCircle, className: 'bg-gray-50 text-gray-500 border-gray-200/60' },
    BAD_TIMING: { icon: AlertCircle, className: 'bg-amber-50 text-amber-600 border-amber-200/60' }
  };
  const { icon: Icon, className } = config[status] || config.NOT_CONNECTED;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${className}`}>
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
          className={`w-3.5 h-3.5 ${star <= starCount ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'}`}
        />
      ))}
      <span className="ml-1.5 text-xs text-gray-500">{rating || 0}<span className="text-gray-400">/10</span></span>
    </div>
  );
});
StarRating.displayName = 'StarRating';

// Temperature badge
const TemperatureBadge = memo(({ temperature }) => {
  const styles = {
    HOT: 'bg-rose-50 text-rose-600 border-rose-200/60',
    WARM: 'bg-amber-50 text-amber-600 border-amber-200/60',
    COLD: 'bg-sky-50 text-sky-600 border-sky-200/60'
  };
  const dots = { HOT: 'bg-rose-400', WARM: 'bg-amber-400', COLD: 'bg-sky-400' };
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border ${styles[temperature] || styles.COLD}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[temperature] || dots.COLD}`} />
      {temperature || 'COLD'}
    </span>
  );
});
TemperatureBadge.displayName = 'TemperatureBadge';

// Sortable header component
const SortableHeader = memo(({ label, column, currentSort, onSort, className = '' }) => (
  <th
    onClick={() => onSort(column)}
    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 select-none group transition-colors ${className}`}
  >
    <div className="flex items-center gap-1.5">
      {label}
      {currentSort.column === column ? (
        currentSort.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-gray-700" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
      ) : (
        <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  </th>
));
SortableHeader.displayName = 'SortableHeader';

// Session row component
const SessionRow = memo(({ session, onContactClick, index }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <tr className={`group hover:bg-blue-50/40 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
      <td className="px-4 py-3.5">
        <button
          onClick={() => onContactClick(session.contact_id)}
          className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
        >
          {session.contact_name || 'Unknown'}
        </button>
        <p className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">{session.contact_email}</p>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="p-1.5 rounded-md bg-gray-100/80">
            <ModeIcon mode={session.mode_of_contact} />
          </div>
          <span className="text-sm">{session.mode_of_contact || 'CALL'}</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={session.session_status} />
      </td>
      <td className="px-4 py-3.5">
        <StarRating rating={session.rating} />
      </td>
      <td className="px-4 py-3.5">
        <TemperatureBadge temperature={session.contact_temperature} />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm">{formatDate(session.created_at)}</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm">{formatTime(session.created_at)}</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm text-gray-700">{session.employee_name || '—'}</span>
      </td>
    </tr>
  );
});
SessionRow.displayName = 'SessionRow';

const StageFollowupsPage = () => {
  const { stage } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { getCachedSessions, setCachedSessions, isCacheValid } = useSessionsCache();
  
  const normalizedStage = stage?.toUpperCase();
  const stageConfig = STAGE_CONFIG[normalizedStage] || STAGE_CONFIG.LEAD;
  
  // Track if initial load from cache
  const initialLoadRef = useRef(true);

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch sessions with cache support
  const fetchSessions = useCallback(async (forceRefresh = false) => {
    if (!normalizedStage || !STAGE_CONFIG[normalizedStage]) {
      setError('Invalid stage');
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && initialLoadRef.current) {
      const cached = getCachedSessions(normalizedStage);
      if (cached) {
        setSessions(cached.sessions || []);
        setTotal(cached.total || 0);
        setLoading(false);
        initialLoadRef.current = false;
        return;
      }
    }
    
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const data = await getAllSessionsByStage(normalizedStage);
      const sessionsData = data.sessions || [];
      const totalCount = data.total || 0;
      
      setSessions(sessionsData);
      setTotal(totalCount);
      
      // Update cache
      setCachedSessions(normalizedStage, sessionsData, totalCount);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      initialLoadRef.current = false;
    }
  }, [normalizedStage, getCachedSessions, setCachedSessions]);

  // Initial load - check cache or fetch
  useEffect(() => {
    initialLoadRef.current = true;
    fetchSessions();
  }, [normalizedStage]); // Only re-run when stage changes

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    fetchSessions(true);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-sky-100 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-sky-500 rounded-full animate-spin border-t-transparent" />
        </div>
        <p className="text-gray-500 font-medium animate-pulse">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-gray-900 font-semibold text-lg">Something went wrong</p>
          <p className="text-gray-500 mt-1">{error}</p>
        </div>
        <button onClick={fetchSessions} className="px-5 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 font-medium transition-colors shadow-lg shadow-sky-500/20">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with colored banner */}
      <div className={`bg-gradient-to-r ${stageConfig.gradient} px-4 sm:px-6 lg:px-8 pt-6 pb-42 rounded-xl`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">{stageConfig.label} Sessions</h1>
            <p className="text-white/70 text-sm mt-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Track all interactions at this pipeline stage
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 disabled:opacity-50 backdrop-blur-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Overlapping the header */}
      <div className="px-4 sm:px-6 lg:px-8 -mt-38 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200/60">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm font-medium">Total Sessions</p>
              <div className={`p-2 rounded-lg ${stageConfig.lightBg} ${stageConfig.accent}`}>
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <div className={`mt-3 h-1 rounded-full bg-gray-100 overflow-hidden`}>
              <div className={`h-full ${stageConfig.color} rounded-full`} style={{ width: '100%' }} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200/60">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm font-medium">Connected</p>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{stats.connected}</p>
              <span className="text-sm text-emerald-600 font-semibold">
                {stats.total > 0 ? ((stats.connected / stats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.total > 0 ? (stats.connected / stats.total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200/60">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm font-medium">Avg Rating</p>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold text-gray-900">{stats.avgRating}</p>
              <span className="text-gray-400 text-lg font-medium">/10</span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(stats.avgRating / 10) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="h-10"></div>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all bg-white placeholder:text-gray-400"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 appearance-none cursor-pointer transition-all text-gray-600"
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
                className="pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 appearance-none cursor-pointer transition-all text-gray-600"
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

            <div className="flex-1" />
            
            <span className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{filteredSortedSessions.length}</span> of {sessions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <SortableHeader label="Contact" column="contact_name" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Mode" column="mode_of_contact" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Status" column="session_status" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Rating" column="rating" currentSort={sortConfig} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temperature
                  </th>
                  <SortableHeader label="Date" column="created_at" currentSort={sortConfig} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <SortableHeader label="Employee" column="employee_name" currentSort={sortConfig} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {paginatedSessions.map((session, index) => (
                  <SessionRow 
                    key={session.session_id} 
                    session={session} 
                    onContactClick={handleContactClick}
                    index={index}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                <span className="font-medium text-gray-700">{Math.min(currentPage * PAGE_SIZE, filteredSortedSessions.length)}</span> of{' '}
                <span className="font-medium text-gray-700">{filteredSortedSessions.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="First page"><ChevronsLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Previous"><ChevronLeft className="w-4 h-4" /></button>
                <div className="flex items-center gap-0.5 mx-1">
                  {(() => {
                    const pages = [];
                    let start = Math.max(1, currentPage - 2);
                    let end = Math.min(totalPages, start + 4);
                    if (end - start < 4) start = Math.max(1, end - 4);
                    
                    if (start > 1) {
                      pages.push(<button key={1} onClick={() => setCurrentPage(1)} className="min-w-[32px] h-8 px-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors">1</button>);
                      if (start > 2) pages.push(<span key="start-ellipsis" className="px-1 text-gray-400">...</span>);
                    }
                    for (let i = start; i <= end; i++) {
                      pages.push(
                        <button key={i} onClick={() => setCurrentPage(i)} className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${currentPage === i ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i}</button>
                      );
                    }
                    if (end < totalPages) {
                      if (end < totalPages - 1) pages.push(<span key="end-ellipsis" className="px-1 text-gray-400">...</span>);
                      pages.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="min-w-[32px] h-8 px-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors">{totalPages}</button>);
                    }
                    return pages;
                  })()}
                </div>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Next"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Last page"><ChevronsRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {filteredSortedSessions.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium">No sessions found</p>
              <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || modeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : `No sessions logged at the ${stageConfig.label} stage yet`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StageFollowupsPage;
