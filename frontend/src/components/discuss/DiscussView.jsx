import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Hash, Lock, Plus, Search, Users, X, Send, Pencil, Trash2,
  MessageSquare, AtSign, ChevronDown, UserPlus, Check, Bell,
  Paperclip, Mic, MicOff, FileDown, Music, Image as ImageIcon,
  Pin, Smile, MoreHorizontal, MessageCircle, ChevronRight, Phone, PhoneOff, Video
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket, useSocketEvent } from '../../context/SocketContext';
import * as discussService from '../../services/discussService';
import LiveKitCallView, { IncomingCallBanner } from './LiveKitCallView';


// Base URL for serving uploaded files (backend static route)
// Strip the /api path suffix so file URLs become http://host:port/uploads/...
// rather than http://host:port/api/uploads/... (which doesn't exist as a static route)
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  .replace(/\/api\/?$/, '')   // remove trailing /api
  .replace(/\/$/, '');        // remove trailing slash

/* =====================================================
   MENTION HELPERS
===================================================== */

const renderContent = (content) => {
  if (!content) return null;
  const parts = [];
  let lastIndex = 0;
  const regex = /(?:@\[([^\]]*)\]\(emp:(\d+)\))|(?:#\[([^\]]*)\]\(deal:(\d+)\))/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
    }
    if (match[1] !== undefined) {
      parts.push(
        <span key={match.index} className="inline-flex items-center gap-0.5 bg-sky-100 text-sky-700 rounded px-1.5 py-0.5 text-xs font-medium mx-0.5">
          @{match[1]}
        </span>
      );
    } else if (match[3] !== undefined) {
      parts.push(
        <span key={match.index} className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5 text-xs font-medium mx-0.5">
          #{match[3]}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
  }
  return parts.length > 0 ? parts : content;
};

/* =====================================================
   CHANNEL LIST SIDEBAR
===================================================== */

/* =====================================================
   NEW DM PICKER MODAL
   Shown when user clicks "+" next to "Direct Messages"
===================================================== */

const NewDmModal = memo(({ onClose, onStart, currentEmpId }) => {
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    discussService.getDmEmployees()
      .then(setEmployees)
      .catch(console.error)
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
    );
  }, [employees, query]);

  const handleStart = async (emp) => {
    setOpening(emp.emp_id);
    try {
      const result = await onStart(emp);
      if (result) onClose();
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">New Direct Message</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto max-h-72 p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              {query ? 'No employees match your search' : 'No employees available'}
            </p>
          ) : (
            filtered.map(emp => (
              <button
                key={emp.emp_id}
                onClick={() => handleStart(emp)}
                disabled={opening === emp.emp_id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
              >
                {emp.profile_picture ? (
                  <img src={emp.profile_picture} alt={emp.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {emp.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                  <p className="text-xs text-gray-400 truncate">{emp.email}</p>
                </div>
                {opening === emp.emp_id ? (
                  <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-gray-300 group-hover:text-sky-400 flex-shrink-0 transition-colors" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
NewDmModal.displayName = 'NewDmModal';

/* =====================================================
   CHANNEL LIST SIDEBAR
===================================================== */

const ChannelList = memo(({ channels, dmChannels, activeChannelId, onSelect, onCreateClick, onBrowseClick, onNewDmClick, collapsed }) => {
  if (collapsed) return null;

  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* ---- Channels Section ---- */}
      <div className="border-b border-gray-100">
        <div className="px-3 py-2.5 flex items-center justify-between">
          <button
            onClick={() => setChannelsExpanded(p => !p)}
            className="flex items-center gap-1 text-sm font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900 transition-colors"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${channelsExpanded ? 'rotate-90' : ''}`} />
            Channels
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onBrowseClick}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="Browse public channels"
            >
              <Search className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={onCreateClick}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="Create channel"
            >
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {channelsExpanded && (
          <div className="pb-2 px-2 space-y-0.5">
            {channels.map((ch) => {
              const isActive = ch.channel_id === activeChannelId;
              const Icon = ch.channel_type === 'PRIVATE' ? Lock : Hash;
              return (
                <button
                  key={ch.channel_id}
                  onClick={() => onSelect(ch.channel_id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-sky-100 text-sky-800 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{ch.name}</span>
                  {ch.unread_count > 0 && (
                    <span className="bg-sky-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {ch.unread_count > 99 ? '99+' : ch.unread_count}
                    </span>
                  )}
                </button>
              );
            })}
            {channels.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No channels yet</p>
            )}
          </div>
        )}
      </div>

      {/* ---- Direct Messages Section ---- */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 py-2.5 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setDmsExpanded(p => !p)}
            className="flex items-center gap-1 text-sm font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900 transition-colors"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${dmsExpanded ? 'rotate-90' : ''}`} />
            Direct Messages
          </button>
          <button
            onClick={onNewDmClick}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="New direct message"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {dmsExpanded && (
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {dmChannels.map((dm) => {
              const isActive = dm.channel_id === activeChannelId;
              const initial = dm.peer_name?.charAt(0).toUpperCase() || '?';
              return (
                <button
                  key={dm.channel_id}
                  onClick={() => onSelect(dm.channel_id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-sky-100 text-sky-800 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {/* Avatar */}
                  {dm.peer_avatar ? (
                    <img src={dm.peer_avatar} alt={dm.peer_name}
                      className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[9px] font-bold">{initial}</span>
                    </div>
                  )}
                  <span className="flex-1 text-left truncate">{dm.peer_name}</span>
                  {dm.unread_count > 0 && (
                    <span className="bg-sky-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {dm.unread_count > 99 ? '99+' : dm.unread_count}
                    </span>
                  )}
                </button>
              );
            })}
            {dmChannels.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No messages yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
ChannelList.displayName = 'ChannelList';

/* =====================================================
   BROWSE PUBLIC CHANNELS MODAL
===================================================== */

const BrowseChannelsModal = memo(({ onClose, myChannelIds, onJoined }) => {
  const [allChannels, setAllChannels] = useState([]);
  const [query, setQuery] = useState('');
  const [joining, setJoining] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    discussService.browseChannels()
      .then(setAllChannels)
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allChannels.filter(ch =>
      !q ||
      ch.name.toLowerCase().includes(q) ||
      ch.description?.toLowerCase().includes(q)
    );
  }, [allChannels, query]);

  const handleJoin = async (ch) => {
    if (joining) return;
    setJoining(ch.channel_id);
    try {
      await discussService.joinChannel(ch.channel_id);
      onJoined(ch);
      // mark as joined locally
      setAllChannels(prev =>
        prev.map(c => c.channel_id === ch.channel_id ? { ...c, _joined: true } : c)
      );
    } catch (e) {
      console.error('Join failed:', e);
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Browse Public Channels</h3>
            <p className="text-xs text-gray-400 mt-0.5">Find and join open channels in your organization</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search channels..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {loadingList ? (
            <div className="text-center py-10 text-gray-400 text-sm">Loading channels…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              {query ? `No channels match "${query}"` : 'No public channels available'}
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {filtered.map(ch => {
                const isMember = myChannelIds.has(ch.channel_id) || ch._joined;
                return (
                  <div key={ch.channel_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate"># {ch.name}</div>
                      {ch.description && (
                        <div className="text-xs text-gray-400 truncate">{ch.description}</div>
                      )}
                      <div className="text-[11px] text-gray-400 mt-0.5">{ch.member_count || 0} members</div>
                    </div>
                    <button
                      onClick={() => !isMember && handleJoin(ch)}
                      disabled={isMember || joining === ch.channel_id}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isMember
                          ? 'bg-gray-100 text-gray-400 cursor-default'
                          : joining === ch.channel_id
                          ? 'bg-sky-100 text-sky-400 cursor-wait'
                          : 'bg-sky-500 text-white hover:bg-sky-600'
                      }`}
                    >
                      {isMember ? 'Joined' : joining === ch.channel_id ? 'Joining…' : 'Join'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
BrowseChannelsModal.displayName = 'BrowseChannelsModal';

/* =====================================================
   CREATE CHANNEL MODAL
===================================================== */

const CreateChannelModal = memo(({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState('PUBLIC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await discussService.createChannel({
        name: name.trim(),
        description: description.trim(),
        channelType,
      });
      onCreated(result);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Channel</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name</label>
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. project-alpha"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                maxLength={80}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              maxLength={255}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Channel Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setChannelType('PUBLIC')}
                className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 text-sm transition-colors ${
                  channelType === 'PUBLIC'
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Hash className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Public</div>
                  <div className="text-[11px] text-gray-400">Anyone can join</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setChannelType('PRIVATE')}
                className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 text-sm transition-colors ${
                  channelType === 'PRIVATE'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Lock className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Private</div>
                  <div className="text-[11px] text-gray-400">Invite only</div>
                </div>
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
CreateChannelModal.displayName = 'CreateChannelModal';

/* =====================================================
   INVITE MODAL
===================================================== */

const InviteModal = memo(({ channelId, onClose, onInvited }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
    discussService.getInvitableEmployees(channelId)
      .then(setEmployees)
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [channelId]);

  const filtered = useMemo(() =>
    employees.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase())
    ),
  [employees, search]);

  const toggle = (empId) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(empId) ? next.delete(empId) : next.add(empId);
      return next;
    });
  };

  const handleInvite = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await discussService.inviteToChannel(channelId, [...selected]);
      onInvited(result);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Invite People</h3>
            <p className="text-xs text-gray-400 mt-0.5">Add teammates from your organization</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or department..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {employees.length === 0 ? 'All organization members are already in this channel' : 'No results found'}
              </p>
            </div>
          )}

          {!loading && filtered.map((emp) => {
            const isSelected = selected.has(emp.emp_id);
            return (
              <button
                key={emp.emp_id}
                onClick={() => toggle(emp.emp_id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors mb-0.5 ${
                  isSelected ? 'bg-sky-50 border border-sky-200' : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isSelected
                    ? 'bg-sky-500 text-white'
                    : 'bg-gradient-to-br from-sky-400 to-indigo-500 text-white'
                }`}>
                  {isSelected ? <Check className="w-4 h-4" /> : emp.name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{emp.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {emp.role}{emp.department ? ` · ${emp.department}` : ''}
                  </p>
                </div>

                {isSelected && (
                  <span className="text-xs text-sky-600 font-medium bg-sky-100 px-2 py-0.5 rounded-full">Selected</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {selected.size > 0 ? `${selected.size} selected` : 'Select people to invite'}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={selected.size === 0 || submitting}
                className="px-4 py-1.5 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {submitting ? 'Inviting...' : `Invite${selected.size > 0 ? ` (${selected.size})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
InviteModal.displayName = 'InviteModal';

/* =====================================================
   SINGLE MESSAGE BUBBLE
===================================================== */

const AVATAR_COLORS = {
  ADMIN: 'bg-gradient-to-br from-orange-400 to-orange-600',
  EMPLOYEE: 'bg-gradient-to-br from-emerald-400 to-teal-500',
  default: 'bg-gradient-to-br from-sky-400 to-indigo-500',
};

/** Emoji reactions whitelist — must mirror ALLOWED_EMOJIS in discuss.service.js */
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙌'];

/**
 * Renders children into document.body via a portal with position:fixed.
 * `anchorRect`  — DOMRect of the trigger button (from getBoundingClientRect()).
 * `alignRight`  — when true, right-aligns the popover to the button's right edge.
 * This escapes any overflow:hidden / overflow:auto ancestor clipping.
 */
const FloatingPortal = ({ children, anchorRect, alignRight = false }) => {
  if (!anchorRect) return null;
  const style = {
    position: 'fixed',
    zIndex: 9999,
    bottom: window.innerHeight - anchorRect.top + 6,
    ...(alignRight
      ? { right: window.innerWidth - anchorRect.right }
      : { left: anchorRect.left }),
  };
  return createPortal(<div style={style}>{children}</div>, document.body);
};

const MessageBubble = memo(({ message, isOwn, onEdit, onDelete, onReply, hideReplyBtn = false, highlighted = false, isPinned = false, onPin, reactions = [], onReact, currentEmpId }) => {
  const [showActions, setShowActions] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  // Anchor rects drive both visibility AND portal positioning for the two popovers.
  // Storing DOMRect (measured at click time) instead of a boolean lets FloatingPortal
  // paint them at position:fixed, escaping the overflow-y-auto scroll container.
  const [emojiAnchorRect, setEmojiAnchorRect] = useState(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const smileBtnRef = useRef(null);
  const menuBtnRef = useRef(null);
  // Derived booleans for button active-state styling
  const showEmojiPicker = !!emojiAnchorRect;
  const showMenu = !!menuAnchorRect;
  // Delay-hide timer: keeps popovers alive while mouse moves from button into portal.
  const hideTimerRef = useRef(null);
  const showHoverActions = () => { clearTimeout(hideTimerRef.current); setShowActions(true); };
  const hideHoverActions = () => {
    hideTimerRef.current = setTimeout(() => {
      setShowActions(false);
      setEmojiAnchorRect(null);
      setMenuAnchorRect(null);
    }, 150);
  };
  // Cleanup on unmount
  useEffect(() => () => clearTimeout(hideTimerRef.current), []);


  // Trigger flash when highlighted prop flips to true
  useEffect(() => {
    if (!highlighted) return;
    setIsFlashing(true);
    const t = setTimeout(() => setIsFlashing(false), 2500);
    return () => clearTimeout(t);
  }, [highlighted]);

  const time = new Date(message.created_at).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const avatarColor = AVATAR_COLORS[message.sender_role] || AVATAR_COLORS.default;
  const isEdited = !!message.is_edited;   // tinyint 0 → false
  const isDeleted = !!message.is_deleted; // tinyint 0 → false

  return (
    <div
      data-message-id={message.message_id}
      className={`group flex gap-3 px-4 py-1.5 transition-colors duration-700 ${
        isFlashing
          ? 'bg-amber-50 ring-2 ring-inset ring-amber-300'
          : isPinned
            ? 'bg-amber-50 hover:bg-amber-100'
            : 'hover:bg-gray-50'
      } ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => showHoverActions()}
      onMouseLeave={() => hideHoverActions()}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5`}>
        {(message.sender_name || 'U')[0].toUpperCase()}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Name + time */}
        <div className="flex items-baseline gap-2">
          <span className={`font-semibold text-sm ${isOwn ? 'text-indigo-700' : 'text-gray-900'}`}>
            {message.sender_name}
            {message.sender_role === 'ADMIN' && (
              <span className="ml-1 text-[9px] font-bold text-orange-500 uppercase tracking-wider">Admin</span>
            )}
          </span>
          <span className="text-[11px] text-gray-400">{time}</span>
          {isEdited && <span className="text-[10px] text-gray-400">(edited)</span>}
          {isPinned && <Pin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" title="Pinned" />}
        </div>
        {/* Bubble */}
        <div
          className={`mt-0.5 rounded-2xl text-sm leading-relaxed max-w-[75%] overflow-hidden ${
            isOwn
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'
          }`}
        >
          {/* Text content */}
          {!isDeleted && message.content && (
            <div className="px-3 py-2 break-words whitespace-pre-wrap">
              {renderContent(message.content)}
            </div>
          )}
          {isDeleted && (
            <div className="px-3 py-2">
              <span className={`italic ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
                This message was deleted
              </span>
            </div>
          )}

          {/* Attachment */}
          {!isDeleted && message.attachment_url && (() => {
            const url = /^https?:\/\//.test(message.attachment_url)
              ? message.attachment_url
              : `${API_BASE}${message.attachment_url}`;
            const mime = message.attachment_type || '';
            const isImg = mime.startsWith('image/');
            const isAudio = mime.startsWith('audio/') || mime === 'video/webm' || /voice/i.test(message.attachment_name || '');
            // Extract duration stored in name e.g. "Voice note (12s)"
            const durMatch = message.attachment_name?.match(/(\d+)s\)$/);
            const durLabel = durMatch ? `${durMatch[1]}s` : null;
            if (isImg) return (
              <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={url}
                  alt={message.attachment_name || 'image'}
                  className="max-w-full max-h-64 object-contain w-full bg-black/5"
                  loading="lazy"
                  onError={(e) => {
                    // Image failed to load — show filename + download link instead
                    const parent = e.target.parentNode;
                    if (parent) {
                      parent.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:12px">
                        📎 <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${message.attachment_name || 'image'}</span>
                      </div>`;
                    }
                  }}
                />
              </a>
            );

            if (isAudio) return (
              <div className="px-3 py-2">
                <div className={`flex items-center gap-1 mb-1 text-[11px] font-medium ${
                  isOwn ? 'text-indigo-100' : 'text-gray-500'
                }`}>
                  <Music className="w-3 h-3" />
                  <span>Voice note</span>
                  {durLabel && (
                    <span className={`ml-auto font-mono text-[10px] ${
                      isOwn ? 'text-indigo-200' : 'text-gray-400'
                    }`}>{durLabel}</span>
                  )}
                </div>
                <audio
                  controls
                  preload="metadata"
                  className="w-full"
                  style={{ height: '32px', minWidth: '200px' }}
                  ref={(el) => {
                    if (!el) return;
                    // Listen for errors on the <source> child AND the <audio>
                    // itself.  When all sources fail, the <audio> fires an
                    // 'error' on each <source> then stops — we catch it here
                    // and replace the player with a download link.
                    const showFallback = () => {
                      const wrapper = el.parentNode;
                      if (wrapper) {
                        wrapper.innerHTML = `<a href="${url}" download style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px;color:inherit;text-decoration:underline">
                          \u{1F507} Voice note could not be played \u2014 click to download
                        </a>`;
                      }
                    };
                    el.onerror = showFallback;
                    // Also listen on child <source> elements  
                    const src = el.querySelector('source');
                    if (src) src.onerror = showFallback;
                  }}
                >
                  <source src={url} type={mime || undefined} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            );

            // Generic file download card
            const sizeFmt = message.attachment_size
              ? message.attachment_size > 1048576
                ? `${(message.attachment_size / 1048576).toFixed(1)} MB`
                : `${(message.attachment_size / 1024).toFixed(0)} KB`
              : '';
            return (
              <a
                href={url}
                download={message.attachment_name}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-2 border-t ${
                  isOwn ? 'border-indigo-500 hover:bg-indigo-700' : 'border-gray-200 hover:bg-gray-200'
                } transition-colors`}
              >
                <FileDown className={`w-4 h-4 flex-shrink-0 ${
                  isOwn ? 'text-indigo-200' : 'text-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{message.attachment_name}</p>
                  {sizeFmt && <p className={`text-[10px] ${
                    isOwn ? 'text-indigo-200' : 'text-gray-400'
                  }`}>{sizeFmt}</p>}
                </div>
              </a>
            );
          })()}
        </div>
        {/* Emoji reaction pills — always visible, click to toggle */}
        {!isDeleted && reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {reactions.map(r => {
              const isMine = currentEmpId != null && r.empIds.includes(currentEmpId);
              return (
                <button
                  key={r.emoji}
                  onClick={() => onReact?.(message.message_id, r.emoji)}
                  className={`flex items-center gap-0.5 text-sm px-2 py-0.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${
                    isMine
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  title={isMine ? 'Click to remove your reaction' : 'Click to react'}
                >
                  <span>{r.emoji}</span>
                  <span className="text-xs font-semibold ml-0.5">{r.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread reply count — persistent inline badge */}
        {!isDeleted && !!message.reply_count && (
          <button
            onClick={() => onReply(message)}
            className={`mt-1 flex items-center gap-1 text-xs font-medium transition-colors ${
              isOwn ? 'text-indigo-300 hover:text-white' : 'text-sky-600 hover:text-sky-800'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Hover Actions — emoji button + 3-dot menu */}
      {showActions && !message.is_deleted && (
        <div className="flex items-center gap-0.5 self-center">

          {/* Emoji picker — rendered via portal to escape overflow clipping */}
          <FloatingPortal anchorRect={emojiAnchorRect} alignRight={isOwn}>
            <div
              className="bg-white border border-gray-200 rounded-full shadow-lg flex items-center gap-0.5 px-1.5 py-1"
              onMouseEnter={() => showHoverActions()}
              onMouseLeave={() => hideHoverActions()}
            >
              {onReact && EMOJI_OPTIONS.map(emoji => {
                const reacted = reactions.some(
                  r => r.emoji === emoji && currentEmpId != null && r.empIds.includes(currentEmpId)
                );
                return (
                  <button
                    key={emoji}
                    onClick={() => { onReact(message.message_id, emoji); setEmojiAnchorRect(null); }}
                    className={`text-base w-7 h-7 flex items-center justify-center rounded-full transition-all hover:scale-125 ${
                      reacted ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-gray-100'
                    }`}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </FloatingPortal>

          {/* 3-dot dropdown — rendered via portal to escape overflow clipping */}
          <FloatingPortal anchorRect={menuAnchorRect} alignRight={isOwn}>
            <div
              className="bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px]"
              onMouseEnter={() => showHoverActions()}
              onMouseLeave={() => hideHoverActions()}
            >
              {!hideReplyBtn && (
                <button
                  onClick={() => { onReply(message); setMenuAnchorRect(null); }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                  Reply
                </button>
              )}
              {onPin && (
                <button
                  onClick={() => { onPin(message); setMenuAnchorRect(null); }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-500' : 'text-gray-400'}`} />
                  {isPinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              {isOwn && (
                <>
                  <button
                    onClick={() => { onEdit(message); setMenuAnchorRect(null); }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    Edit
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={() => { onDelete(message); setMenuAnchorRect(null); }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </FloatingPortal>

          {/* Smile / add-reaction button */}
          {onReact && (
            <button
              ref={smileBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                setEmojiAnchorRect(prev => prev ? null : smileBtnRef.current?.getBoundingClientRect() ?? null);
                setMenuAnchorRect(null);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                showEmojiPicker ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-200 text-gray-400'
              }`}
              title="Add reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 3-dot options button */}
          <button
            ref={menuBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchorRect(prev => prev ? null : menuBtnRef.current?.getBoundingClientRect() ?? null);
              setEmojiAnchorRect(null);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              showMenu ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-200 text-gray-400'
            }`}
            title="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

        </div>
      )}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

/* =====================================================
   MENTION AUTOCOMPLETE POPUP
===================================================== */

const MentionPopup = memo(({ items, type, onSelect, position }) => {
  if (!items || items.length === 0) return null;

  return (
    <div
      className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto w-64"
      style={{ left: position }}
    >
      <div className="p-1.5">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider px-2 py-1">
          {type === 'employee' ? 'Employees' : 'Deals'}
        </p>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg hover:bg-sky-50 transition-colors text-left"
          >
            {type === 'employee' ? (
              <>
                <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold">
                  {item.name[0]}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{item.name}</div>
                  <div className="text-[11px] text-gray-400">{item.email}</div>
                </div>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">#</div>
                <div className="font-medium text-gray-800">{item.name}</div>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});
MentionPopup.displayName = 'MentionPopup';

/* =====================================================
   MESSAGE COMPOSER (with mention autocomplete)
===================================================== */

/* =====================================================
   ATTACHMENT PREVIEW STRIP (inside composer)
===================================================== */

const AttachmentPreview = memo(({ attachment, onRemove }) => {
  if (!attachment) return null;
  const isImage = attachment.type?.startsWith('image/');
  const isAudio = attachment.type?.startsWith('audio/');
  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-gray-50 border border-gray-200 rounded-xl">
      {isImage && attachment.previewUrl && (
        <img src={attachment.previewUrl} className="h-10 w-10 object-cover rounded-lg" alt="preview" />
      )}
      {isAudio && <Music className="w-5 h-5 text-sky-500 flex-shrink-0" />}
      {!isImage && !isAudio && <FileDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">{attachment.name}</p>
        <p className="text-[10px] text-gray-400">
          {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : ''}
        </p>
      </div>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
});
AttachmentPreview.displayName = 'AttachmentPreview';

/* =====================================================
   MESSAGE COMPOSER (text + file picker + audio)
===================================================== */

const MessageComposer = memo(({ channelId, members, deals, editingMessage, onCancelEdit, parentMessageId = null, placeholder: placeholderProp }) => {
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [attachment, setAttachment] = useState(null);   // { file, previewUrl, type, name, size }
  const [uploading, setUploading] = useState(false);

  // Audio recording state
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recStartTimeRef = useRef(0);   // Date.now() when recording started
  const mediaRecRef = useRef(null);
  const recTimerRef = useRef(null);
  const chunksRef = useRef([]);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { emit } = useSocket();

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // ---- Text change + mention detection ----
  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    const cursorPos = e.target.selectionStart;
    const before = val.slice(0, cursorPos);
    const atMatch = before.match(/@(\w*)$/);
    const hashMatch = before.match(/#(\w*)$/);
    if (atMatch) setMentionQuery({ type: 'employee', query: atMatch[1].toLowerCase(), startIndex: cursorPos - atMatch[0].length });
    else if (hashMatch) setMentionQuery({ type: 'deal', query: hashMatch[1].toLowerCase(), startIndex: cursorPos - hashMatch[0].length });
    else setMentionQuery(null);
  };

  const filteredItems = useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.query;
    if (mentionQuery.type === 'employee') {
      return (members || []).filter(m => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)).slice(0, 8).map(m => ({ id: m.emp_id, name: m.name, email: m.email }));
    }
    return (deals || []).filter(d => d.product_name?.toLowerCase().includes(q)).slice(0, 8).map(d => ({ id: d.deal_id, name: d.product_name }));
  }, [mentionQuery, members, deals]);

  const handleMentionSelect = (item) => {
    if (!mentionQuery) return;
    const before = text.slice(0, mentionQuery.startIndex);
    const after = text.slice(inputRef.current?.selectionStart || text.length);
    const ins = mentionQuery.type === 'employee' ? `@[${item.name}](emp:${item.id}) ` : `#[${item.name}](deal:${item.id}) `;
    setText(before + ins + after);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  // ---- File picker ----
  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setAttachment({ file, previewUrl, type: file.type, name: file.name, size: file.size });
    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  };

  // ---- Audio recorder ----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick a MIME type the browser genuinely records audio with.
      // IMPORTANT: OGG must come BEFORE WebM — Firefox claims to support
      // audio/webm;codecs=opus but silently produces a VP8 video-only WebM
      // file with no audio track, causing playback to fail.  OGG is Firefox's
      // native recording format and always works correctly.
      const types = [
        'audio/ogg;codecs=opus',   // Firefox native — always works
        'audio/webm;codecs=opus',  // Chrome / Edge native
        'audio/webm',              // Generic WebM fallback
        'audio/wav',               // Last-resort uncompressed
      ];
      const supportedType = types.find(t => MediaRecorder.isTypeSupported(t));

      // If nothing matched, let the browser pick its default
      const mrOpts = supportedType ? { mimeType: supportedType } : undefined;
      const mr = new MediaRecorder(stream, mrOpts);
      // Capture what the recorder is actually using (may differ from request)
      const actualMime = mr.mimeType;

      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: actualMime });
        // Compute duration from wall-clock time — immune to stale React state
        const durationSecs = Math.round((Date.now() - recStartTimeRef.current) / 1000);
        setRecording(false);
        setRecSeconds(0);
        clearInterval(recTimerRef.current);
        // Derive a clean base MIME and file extension from what was actually recorded
        const baseMime = (actualMime || 'audio/webm').split(';')[0];
        const extMap = { 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'video/webm': 'webm' };
        const ext = extMap[baseMime] || 'webm';
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: baseMime });
        setAttachment({ file, previewUrl: null, type: baseMime, name: `Voice note (${durationSecs}s)`, size: blob.size });
      };
      mr.start();
      mediaRecRef.current = mr;
      recStartTimeRef.current = Date.now(); // capture start timestamp
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => {
        setRecSeconds(Math.round((Date.now() - recStartTimeRef.current) / 1000));
      }, 500); // update every 500ms for smooth display
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access is required to record audio.');
    }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    clearInterval(recTimerRef.current);
  };

  // ---- Send ----
  const handleSend = async () => {
    const content = text.trim();
    if (!content && !attachment) return;
    if (uploading) return;

    if (editingMessage) {
      emit('message:edit', { messageId: editingMessage.message_id, content });
      onCancelEdit();
      setText('');
      return;
    }

    // Upload attachment first, then send message
    let attachData = null;
    if (attachment?.file) {
      setUploading(true);
      try {
        attachData = await discussService.uploadAttachment(attachment.file);
      } catch (err) {
        console.error('Upload failed:', err);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    emit('message:send', {
      channelId,
      content: content || undefined,
      parentMessageId: parentMessageId || undefined,
      ...(attachData && {
        attachmentUrl: attachData.url,
        attachmentType: attachData.type,
        attachmentName: attachData.name,
        attachmentSize: attachData.size,
      }),
    }, (res) => { if (res?.error) console.error('Send error:', res.error); });

    setText('');
    removeAttachment();
    setMentionQuery(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') {
      if (mentionQuery) setMentionQuery(null);
      else if (editingMessage) { onCancelEdit(); setText(''); }
    }
  };

  const canSend = (text.trim() || attachment) && !uploading;

  return (
    <div className="relative border-t border-gray-200 bg-white p-3">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        className="hidden"
      />

      {/* Edit banner */}
      {editingMessage && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-amber-50 rounded-lg text-sm">
          <Pencil className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-700 flex-1">Editing message</span>
          <button onClick={() => { onCancelEdit(); setText(''); }} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment preview */}
      <AttachmentPreview attachment={attachment} onRemove={removeAttachment} />

      {/* Recording indicator */}
      {recording && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-red-600 font-medium">Recording…</span>
          <span className="text-sm text-red-500 font-mono">
            {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
          </span>
          <button onClick={stopRecording} className="ml-auto px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">
            Stop & Send
          </button>
        </div>
      )}

      <MentionPopup items={filteredItems} type={mentionQuery?.type} onSelect={handleMentionSelect} position={0} />

      <div className="flex items-end gap-2">
        {/* Attach file button */}
        <button
          onClick={openFilePicker}
          disabled={recording || uploading}
          className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 disabled:opacity-40"
          title="Attach file or image"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Mic button */}
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={!!attachment || uploading}
          className={`p-2 rounded-xl transition-colors flex-shrink-0 disabled:opacity-40 ${
            recording
              ? 'bg-red-100 text-red-500 hover:bg-red-200'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          }`}
          title={recording ? 'Stop recording' : 'Record voice message'}
        >
          {recording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={recording ? 'Recording…' : (placeholderProp || 'Type a message… @ mention, # deal')}
          disabled={recording}
          rows={1}
          className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none max-h-32 overflow-y-auto disabled:bg-gray-50"
          style={{ minHeight: '42px' }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="p-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {uploading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mt-1 px-1">
        <kbd className="bg-gray-100 px-1 rounded text-[10px]">Enter</kbd> to send ·{' '}
        <kbd className="bg-gray-100 px-1 rounded text-[10px]">Shift+Enter</kbd> newline ·{' '}
        <kbd className="bg-gray-100 px-1 rounded text-[10px]">@</kbd> mention ·{' '}
        <kbd className="bg-gray-100 px-1 rounded text-[10px]">#</kbd> deal ·{' '}
        <Paperclip className="inline w-2.5 h-2.5" /> attach
      </p>
    </div>
  );
});
MessageComposer.displayName = 'MessageComposer';

/* =====================================================
   MESSAGE LIST (with infinite scroll)
===================================================== */

const MessageList = memo(({ messages, currentEmpId, channelId, channelName, onEdit, onDelete, onReply, onPin, onReact, onLoadMore, hasMore, loading, highlightedMessageId = null, pinnedIds = null }) => {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const autoScrollRef = useRef(true); // stable ref for use inside effects
  const lastMsgIdRef = useRef(null);  // tracks last seen message_id for new-append detection
  const [unreadCount, setUnreadCount] = useState(0);

  // Keep ref in sync with state (avoids stale closures in effects)
  useEffect(() => { autoScrollRef.current = autoScroll; }, [autoScroll]);

  // Auto-scroll to bottom when new messages arrive and user is already at the bottom
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  // Detect genuine real-time appends and increment unread counter when scrolled up.
  // Uses auto-increment message_id: a new real message always has a higher ID than the
  // previous last, so this cleanly excludes loadMore (prepend) and jump/replace (historical).
  useEffect(() => {
    if (!messages.length) {
      lastMsgIdRef.current = null;
      return;
    }
    const lastMsg = messages[messages.length - 1];
    const prevLastId = lastMsgIdRef.current;
    lastMsgIdRef.current = lastMsg.message_id;

    if (
      prevLastId !== null &&           // skip initial load
      lastMsg.message_id > prevLastId  // true append — message IDs are auto-increment
    ) {
      if (!autoScrollRef.current) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages]);

  // Clear unread badge when user scrolls near the bottom
  useEffect(() => {
    if (autoScroll) setUnreadCount(0);
  }, [autoScroll]);

  // Clear unread badge when user explicitly jumps to a message
  useEffect(() => {
    if (highlightedMessageId) setUnreadCount(0);
  }, [highlightedMessageId]);

  // Scroll highlighted message into view whenever it changes
  useEffect(() => {
    if (!highlightedMessageId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-message-id="${highlightedMessageId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedMessageId, messages]);

  const scrollToBottom = useCallback(() => {
    setUnreadCount(0);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAutoScroll(nearBottom);

    if (el.scrollTop < 60 && hasMore && !loading) {
      prevScrollHeightRef.current = el.scrollHeight;
      onLoadMore();
    }
  };

  useEffect(() => {
    if (prevScrollHeightRef.current > 0 && containerRef.current) {
      const newHeight = containerRef.current.scrollHeight;
      containerRef.current.scrollTop = newHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  const grouped = useMemo(() => {
    const groups = [];
    let lastDate = '';
    for (const msg of messages) {
      const date = new Date(msg.created_at).toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric',
      });
      if (date !== lastDate) {
        groups.push({ type: 'date', date });
        lastDate = date;
      }
      groups.push({ type: 'message', data: msg });
    }
    return groups;
  }, [messages]);

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
      {loading && (
        <div className="flex justify-center py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500" />
        </div>
      )}

      {!hasMore && messages.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-3">Beginning of conversation</p>
      )}

      {grouped.map((item, idx) => {
        if (item.type === 'date') {
          return (
            <div key={`date-${idx}`} className="flex items-center gap-3 px-4 py-2 mt-2">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-[11px] font-medium text-gray-400">{item.date}</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
          );
        }
        const msg = item.data;
        return (
          <MessageBubble
            key={msg.message_id}
            message={msg}
            isOwn={msg.sender_emp_id === currentEmpId}
            onEdit={onEdit}
            onDelete={onDelete}
            onReply={onReply}
            onPin={onPin}
            onReact={onReact}
            currentEmpId={currentEmpId}
            reactions={msg.reactions || []}
            highlighted={msg.message_id === highlightedMessageId}
            isPinned={pinnedIds ? pinnedIds.has(msg.message_id) : false}
          />
        );
      })}

      {messages.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <MessageSquare className="w-12 h-12 mb-2 opacity-30" />
          <p className="text-sm">No messages in this channel yet</p>
          <p className="text-xs">Be the first to say something!</p>
        </div>
      )}

      <div ref={bottomRef} />

      {/* ↓ Unread-messages sticky banner — shown when user is scrolled up and new messages arrive */}
      {unreadCount > 0 && (
        <div className="sticky bottom-3 flex justify-center z-10 pointer-events-none">
          <button
            onClick={scrollToBottom}
            className="pointer-events-auto flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg transition-all duration-150 animate-bounce-subtle"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            {unreadCount} new message{unreadCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
});
MessageList.displayName = 'MessageList';

/* =====================================================
   MESSAGE SEARCH PANEL (slide-over)
===================================================== */

const MessageSearchPanel = memo(({ channelId, channelName, onClose, onJump }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearched(false);
      try {
        const data = await discussService.searchMessages(q, channelId);
        setResults(data);
      } catch (err) {
        console.error('Message search error:', err);
        setResults([]);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, channelId]);

  // Escape the query for safe RegExp usage
  const escapedQ = useMemo(
    () => query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    [query]
  );

  // Wrap matched substrings in <mark>
  const highlight = useCallback((text) => {
    if (!text || !escapedQ) return text;
    const regex = new RegExp(`(${escapedQ})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{part}</mark>
        : part
    );
  }, [escapedQ]);

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-sky-500" />
          <span className="font-semibold text-gray-900 text-sm">Search Messages</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Close search"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Input */}
      <div className="p-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-200 transition-all">
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search in #${channelName}\u2026`}
            maxLength={100}
            className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 px-0.5">
          {query.length > 0 && query.length < 2 ? 'Type at least 2 characters\u2026' : 'Results in this channel only'}
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searching && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500" />
          </div>
        )}

        {!searching && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Search className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">No messages found</p>
            <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
          </div>
        )}

        {!searching && !searched && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Search className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Search messages in this channel</p>
          </div>
        )}

        {!searching && results.length > 0 && (
          <div>
            <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            <div className="divide-y divide-gray-50">
              {results.map(result => (
                <div
                  key={result.message_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onJump?.(result.message_id); onClose(); }}
                  onKeyDown={e => e.key === 'Enter' && (onJump?.(result.message_id), onClose())}
                  className="px-4 py-3 hover:bg-sky-50 active:bg-sky-100 transition-colors cursor-pointer"
                  title="Click to jump to this message"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {(result.sender_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-gray-800 truncate flex-1">{result.sender_name}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {new Date(result.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-3 pl-7 leading-relaxed">
                    {highlight(result.content)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
MessageSearchPanel.displayName = 'MessageSearchPanel';

/* =====================================================
   PINNED MESSAGES PANEL (slide-over)
===================================================== */

const PinnedMessagesPanel = memo(({ pins, onClose, onJump, onUnpin }) => (
  <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
    {/* Header */}
    <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Pin className="w-4 h-4 text-amber-500" />
        <span className="font-semibold text-gray-900 text-sm">Pinned Messages</span>
        {pins.length > 0 && (
          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {pins.length}
          </span>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        title="Close"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>

    {/* List */}
    <div className="flex-1 overflow-y-auto">
      {pins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <Pin className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-500">No pinned messages</p>
          <p className="text-xs text-gray-400 mt-1">Hover a message and click the pin icon</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {pins.map(pin => (
            <div key={pin.pin_id} className="group px-4 py-3 hover:bg-amber-50 transition-colors">
              {/* Pinned-by row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span className="text-[10px] text-amber-600 font-medium truncate">
                    {pin.pinned_by_name}
                    {' · '}
                    {new Date(pin.pinned_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <button
                  onClick={() => onUnpin(pin.message_id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all ml-2"
                  title="Unpin"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>

              {/* Message snippet — click to jump */}
              <button
                className="w-full text-left"
                onClick={() => { onJump(pin.message_id); onClose(); }}
                title="Jump to message"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                    {(pin.sender_name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{pin.sender_name}</span>
                  <span className="text-[10px] text-gray-400 ml-auto">
                    {new Date(pin.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-3 pl-6 leading-relaxed hover:text-gray-900 transition-colors">
                  {pin.content || <em className="text-gray-400">Attachment</em>}
                </p>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
));
PinnedMessagesPanel.displayName = 'PinnedMessagesPanel';

/* =====================================================
   CHANNEL HEADER
===================================================== */

const ChannelHeader = memo(({ channel, memberCount, onMembersClick, onSearchClick, isSearchOpen, onPinsClick, isPinsOpen, pinnedCount, dmPeer, onCallClick, callActive, callLoading, callJoinable, callRejoining }) => {
  if (!channel) return null;
  const isDm = channel.channel_type === 'DM';
  const Icon = isDm ? MessageCircle : (channel.channel_type === 'PRIVATE' ? Lock : Hash);
  const displayName = isDm ? (dmPeer?.peer_name || 'Direct Message') : channel.name;

  return (
    <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {isDm && dmPeer?.peer_avatar ? (
          <img src={dmPeer.peer_avatar} alt={displayName}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
        ) : isDm ? (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          <Icon className="w-5 h-5 text-gray-400" />
        )}
        <h2 className="font-semibold text-gray-900">{displayName}</h2>
        {!isDm && channel.channel_type === 'PRIVATE' && (
          <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">Private</span>
        )}
        {!isDm && channel.description && (
          <span className="text-sm text-gray-400 ml-2 hidden sm:inline">{channel.description}</span>
        )}
        {/* Active call live indicator */}
        {(callActive || callJoinable) && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {callActive ? 'Voice connected' : 'Voice live'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Voice call button */}
        <button
          id="discuss-call-btn"
          onClick={onCallClick}
          disabled={callLoading}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            callActive
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : callLoading
              ? 'bg-gray-100 text-gray-400 cursor-wait'
            : callRejoining
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
              : callJoinable
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300'
              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
          }`}
          title={callActive ? 'Leave voice call' : callRejoining ? 'Re-join active voice call' : callJoinable ? 'Join active voice call' : 'Start voice call'}
        >
          {callLoading
            ? <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            : callActive
            ? <PhoneOff className="w-3.5 h-3.5" />
            : <Phone className="w-3.5 h-3.5" />
          }
          {callActive ? 'Leave Call' : callRejoining ? 'Re-Join' : callJoinable ? 'Join' : 'Call'}
        </button>

        <button
          onClick={onSearchClick}
          className={`p-2 rounded-lg transition-colors ${
            isSearchOpen
              ? 'bg-sky-100 text-sky-600 hover:bg-sky-200'
              : 'hover:bg-gray-100 text-gray-500'
          }`}
          title={isSearchOpen ? 'Close search' : 'Search messages'}
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={onPinsClick}
          className={`relative p-2 rounded-lg transition-colors ${
            isPinsOpen
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
              : 'hover:bg-gray-100 text-gray-500'
          }`}
          title={isPinsOpen ? 'Close pins' : 'Pinned messages'}
        >
          <Pin className="w-4 h-4" />
          {!isPinsOpen && pinnedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {pinnedCount > 9 ? '9+' : pinnedCount}
            </span>
          )}
        </button>
        {!isDm && (
          <button onClick={onMembersClick} className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Members">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">{memberCount || 0}</span>
          </button>
        )}
      </div>
    </div>
  );
});
ChannelHeader.displayName = 'ChannelHeader';

/* =====================================================
   MEMBERS PANEL (slide-over)
===================================================== */

const MembersPanel = memo(({ members, channelId, onClose, onInvited }) => {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <>
      <div className="w-64 border-l border-gray-200 bg-white flex flex-col h-full">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">Members ({members.length})</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        {/* Invite button */}
        <div className="p-2 border-b border-gray-100">
          <button
            onClick={() => setShowInvite(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sky-600 hover:bg-sky-50 rounded-lg transition-colors font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Invite People
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {members.map((m) => (
            <div key={m.emp_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {m.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{m.role} {m.department ? `· ${m.department}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showInvite && (
        <InviteModal
          channelId={channelId}
          onClose={() => setShowInvite(false)}
          onInvited={(result) => {
            setShowInvite(false);
            onInvited(result);
          }}
        />
      )}
    </>
  );
});
MembersPanel.displayName = 'MembersPanel';

/* =====================================================
   INVITE NOTIFICATION BANNER
===================================================== */

const InviteBanner = memo(({ invite, onDismiss, onJoin }) => (
  <div className="fixed bottom-6 right-6 z-50 bg-white border border-sky-200 shadow-xl rounded-2xl p-4 max-w-sm animate-slide-in">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-sky-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">You were invited to a channel</p>
        <p className="text-xs text-gray-500 mt-0.5">
          <span className="font-medium">{invite.inviterName}</span> added you to a channel
        </p>
      </div>
      <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="flex gap-2 mt-3">
      <button
        onClick={onDismiss}
        className="flex-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Dismiss
      </button>
      <button
        onClick={onJoin}
        className="flex-1 px-3 py-1.5 text-xs bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium"
      >
        View Channel
      </button>
    </div>
  </div>
));
InviteBanner.displayName = 'InviteBanner';

/* =====================================================
   THREAD PANEL  (Slack-style slide-over)
===================================================== */

const ThreadPanel = memo(({
  parentMessage,
  replies,
  loading,
  currentEmpId,
  channelId,
  members,
  deals,
  onClose,
  onDeleteReply,
}) => {
  const [editingReply, setEditingReply] = useState(null);
  const bottomRef = useRef(null);

  // Auto-scroll to newest reply
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  return (
    <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-gray-900">Thread</span>
          {replies.length > 0 && (
            <span className="text-xs text-gray-400">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Close thread"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Parent message — read-only preview */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/60">
        <p className="px-4 pt-2 pb-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Original Message</p>
        <MessageBubble
          message={parentMessage}
          isOwn={parentMessage.sender_emp_id === currentEmpId}
          onEdit={() => {}}
          onDelete={() => {}}
          onReply={() => {}}
          hideReplyBtn
        />
      </div>

      {/* Divider with reply count */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
          {replies.length === 0 ? 'No replies yet' : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
        </span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Reply list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500" />
          </div>
        ) : (
          replies.map((reply) => (
            <MessageBubble
              key={reply.message_id}
              message={reply}
              isOwn={reply.sender_emp_id === currentEmpId}
              onEdit={(msg) => setEditingReply(msg)}
              onDelete={onDeleteReply}
              onReply={() => {}}
              hideReplyBtn
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Thread composer */}
      <MessageComposer
        channelId={channelId}
        members={members}
        deals={deals}
        parentMessageId={parentMessage.message_id}
        editingMessage={editingReply}
        onCancelEdit={() => setEditingReply(null)}
        placeholder="Reply in thread…"
      />
    </div>
  );
});
ThreadPanel.displayName = 'ThreadPanel';

/* =====================================================
   MAIN DISCUSS COMPONENT
===================================================== */

const DiscussView = ({ initialIncomingCall = null, autoJoinIncoming = false }) => {
  const { user } = useAuth();
  const { connected, emit } = useSocket();

  const [channels, setChannels] = useState([]);
  const [dmChannels, setDmChannels] = useState([]);
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [isJumpContext, setIsJumpContext] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [pendingInvite, setPendingInvite] = useState(null); // for toast notification

  // Thread panel — tracks which parent message’s thread is open
  const [openThread, setOpenThread]       = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  // Stable ref for socket callbacks to avoid stale-closure bugs
  const openThreadRef = useRef(null);
  useEffect(() => { openThreadRef.current = openThread; }, [openThread]);

  // Auto-clear highlighted message after flash duration
  useEffect(() => {
    if (!highlightedMessageId) return;
    const t = setTimeout(() => setHighlightedMessageId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightedMessageId]);

  // Fetch thread replies whenever the active parent message changes
  useEffect(() => {
    if (!openThread) { setThreadReplies([]); return; }
    setThreadLoading(true);
    discussService.getThread(openThread.message_id)
      .then(setThreadReplies)
      .catch(console.error)
      .finally(() => setThreadLoading(false));
  }, [openThread?.message_id]);



  useEffect(() => {
    loadChannels();
    loadDmChannels();
    loadDeals();
  }, []);

  const loadChannels = async () => {
    try {
      const data = await discussService.getMyChannels();
      setChannels(data);
      if (data.length > 0 && !activeChannelId) {
        selectChannel(data[0].channel_id);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const loadDmChannels = async () => {
    try {
      const data = await discussService.getDmChannels();
      setDmChannels(data);
    } catch (err) {
      console.error('Failed to load DM channels:', err);
    }
  };

  const loadDeals = async () => {
    try {
      const { default: api } = await import('../../services/api');
      const { data } = await api.get('/deals/company/all');
      setDeals(Array.isArray(data) ? data : []);
    } catch {
      setDeals([]);
    }
  };

  const selectChannel = useCallback(async (channelId) => {
    // Leave the current channel room (emit is always fresh via ref)
    if (activeChannelId) {
      emit('channel:leave', activeChannelId);
    }

    setActiveChannelId(channelId);
    setMessages([]);
    setHasMore(true);
    setEditingMessage(null);
    setOpenThread(null);
    setThreadReplies([]);
    setShowSearch(false);
    setShowPins(false);
    setPinnedMessages([]);
    setHighlightedMessageId(null);
    setIsJumpContext(false);

    try {
      setLoading(true);
      const [channelData, messagesData, membersData, pinsData] = await Promise.all([
        discussService.getChannel(channelId),
        discussService.getMessages(channelId),
        discussService.getChannelMembers(channelId),
        discussService.getPins(channelId).catch(() => []),
      ]);

      setActiveChannel(channelData);

      setMessages(messagesData);
      setMembers(membersData);
      setPinnedMessages(pinsData || []);
      setHasMore(messagesData.length >= 50);

      // channel:join is handled by the useEffect below that watches activeChannelId + connected
      discussService.markChannelRead(channelId).catch(() => {});
    } catch (err) {
      console.error('Failed to load channel:', err);
    } finally {
      setLoading(false);
    }
  }, [activeChannelId, emit]);

  // Join the socket channel room whenever the active channel or connection state changes.
  // This is the ONLY place channel:join is emitted — avoids stale socket closure bugs.
  useEffect(() => {
    if (!activeChannelId || !connected) return;
    emit('channel:join', activeChannelId);
  }, [activeChannelId, connected, emit]);

  const loadMore = useCallback(async () => {
    if (!activeChannelId || loading || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;

    setLoading(true);
    try {
      const older = await discussService.getMessages(activeChannelId, { limit: 50, before: oldest.message_id });
      if (older.length < 50) setHasMore(false);
      setMessages(prev => [...older, ...prev]);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoading(false);
    }
  }, [activeChannelId, messages, loading, hasMore]);

  /**
   * Jump to a specific message by ID.
   * If the message is already in the current messages slice, just scroll + highlight.
   * If not, load a fresh batch ending at that message (50 msgs), then scroll + highlight.
   */
  const jumpToMessage = useCallback(async (messageId) => {
    const inView = messages.some(m => m.message_id === messageId);
    setHighlightedMessageId(messageId);
    if (!inView && activeChannelId) {
      setLoading(true);
      try {
        // Load 50 messages ending at (and including) the target
        const batch = await discussService.getMessages(activeChannelId, { limit: 50, before: messageId + 1 });
        setMessages(batch);
        setHasMore(batch.length >= 50);
        setIsJumpContext(true);
      } catch (err) {
        console.error('jumpToMessage failed:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [messages, activeChannelId]);

  /* ---------------------------------------------------
     REAL-TIME EVENT HANDLERS
  --------------------------------------------------- */

  const handleNewMessage = useCallback((msg) => {
    // Thread reply — route to thread panel and increment parent badge
    if (msg.parent_message_id) {
      if (msg.parent_message_id === openThreadRef.current?.message_id) {
        setThreadReplies(prev => {
          if (prev.some(r => r.message_id === msg.message_id)) return prev;
          return [...prev, msg];
        });
      }
      // Bump reply-count badge on the parent message in the main feed
      setMessages(prev =>
        prev.map(m =>
          m.message_id === msg.parent_message_id
            ? { ...m, reply_count: (m.reply_count || 0) + 1 }
            : m
        )
      );
      return; // Don’t push thread replies into the main channel feed
    }

    if (msg.channel_id === activeChannelId) {
      setMessages(prev => {
        if (prev.some(m => m.message_id === msg.message_id)) return prev;
        return [...prev, msg];
      });
    }

    setChannels(prev =>
      prev.map(ch =>
        ch.channel_id === msg.channel_id && ch.channel_id !== activeChannelId
          ? { ...ch, unread_count: (ch.unread_count || 0) + 1 }
          : ch
      )
    );
    // Also update DM unread counts
    setDmChannels(prev =>
      prev.map(dm =>
        dm.channel_id === msg.channel_id && dm.channel_id !== activeChannelId
          ? { ...dm, unread_count: (dm.unread_count || 0) + 1, last_message_preview: msg.content }
          : dm
      )
    );
  }, [activeChannelId]);

  const handleEditedMessage = useCallback((msg) => {
    setMessages(prev => prev.map(m => m.message_id === msg.message_id ? { ...m, ...msg } : m));
    setThreadReplies(prev => prev.map(r => r.message_id === msg.message_id ? { ...r, ...msg } : r));
  }, []);

  const handleDeletedMessage = useCallback(({ messageId }) => {
    setMessages(prev => prev.map(m => m.message_id === messageId ? { ...m, is_deleted: true } : m));
    setThreadReplies(prev => prev.map(r => r.message_id === messageId ? { ...r, is_deleted: true } : r));
  }, []);

  const handleTypingStart = useCallback(({ empId }) => {
    setTypingUsers(prev => {
      if (prev.includes(empId)) return prev;
      return [...prev, empId];
    });
    setTimeout(() => {
      setTypingUsers(prev => prev.filter(id => id !== empId));
    }, 4000);
  }, []);

  const handleTypingStop = useCallback(({ empId }) => {
    setTypingUsers(prev => prev.filter(id => id !== empId));
  }, []);

  /**
   * Handle being invited to a channel (received via personal room)
   * Refreshes channel list and shows a toast notification
   */
  const handleMemberInvited = useCallback((payload) => {
    loadChannels(); // Refresh channel list to include the new channel
    setPendingInvite(payload); // Show invite banner
  }, []);

  const handlePinChange = useCallback(({ channelId, pins }) => {
    if (channelId === activeChannelId) setPinnedMessages(pins);
  }, [activeChannelId]);

  /**
   * Emit a toggle-reaction socket event.
   * The server toggles in DB and broadcasts message:reaction back.
   * Local state is updated optimistically via the socket callback.
   */
  const handleReact = useCallback((messageId, emoji) => {
    emit('message:react', { messageId, emoji });
  }, [emit]);

  /**
   * Real-time reaction update broadcast from server.
   * Replaces the reactions array on matching message in both feed and thread.
   */
  const handleReactionChange = useCallback(({ messageId, reactions }) => {
    setMessages(prev =>
      prev.map(m => m.message_id === messageId ? { ...m, reactions } : m)
    );
    setThreadReplies(prev =>
      prev.map(r => r.message_id === messageId ? { ...r, reactions } : r)
    );
  }, []);

  useSocketEvent('message:new', handleNewMessage);
  useSocketEvent('message:edited', handleEditedMessage);
  useSocketEvent('message:deleted', handleDeletedMessage);
  useSocketEvent('typing:start', handleTypingStart);
  useSocketEvent('typing:stop', handleTypingStop);
  useSocketEvent('member:invited', handleMemberInvited);
  useSocketEvent('pin:change', handlePinChange);
  useSocketEvent('message:reaction', handleReactionChange);

  /* ---------------------------------------------------
     ACTION HANDLERS
  --------------------------------------------------- */

  const handleEdit = (msg) => setEditingMessage(msg);
  const handleCancelEdit = () => setEditingMessage(null);

  const handleDelete = async (msg) => {
    if (!confirm('Delete this message?')) return;
    emit('message:delete', { messageId: msg.message_id });
  };

  const handleReply = useCallback((msg) => {
    // Toggle: clicking the same parent message again closes the panel
    setOpenThread(prev => prev?.message_id === msg.message_id ? null : msg);
    setShowSearch(false); // mutually exclusive panels
    setShowPins(false);
  }, []);

  /**
   * Toggle pin/unpin on a message. Any channel member can pin/unpin.
   * Calls REST API; the controller broadcasts pin:change back to all channel
   * members (including this socket) so every client stays in sync.
   */
  const handlePin = useCallback(async (msg) => {
    if (!activeChannelId) return;
    try {
      const alreadyPinned = pinnedMessages.some(p => p.message_id === msg.message_id);
      const updated = alreadyPinned
        ? await discussService.unpinMessage(activeChannelId, msg.message_id)
        : await discussService.pinMessage(activeChannelId, msg.message_id);
      // Optimistic local update — socket broadcast also arrives and is idempotent
      setPinnedMessages(updated);
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }, [pinnedMessages, activeChannelId]);

  const handleChannelCreated = () => {
    loadChannels();
  };

  /**
   * Open (get-or-create) a DM thread with the selected employee.
   * Called from the NewDmModal. Navigates to the DM channel and
   * emits dm:opened so the peer's sidebar refreshes in real time.
   */
  const handleStartDm = useCallback(async (emp) => {
    try {
      const { channelId, peer } = await discussService.startDm(emp.emp_id);

      // Notify the peer via socket so their sidebar refreshes without polling
      emit('dm:opened', { channelId, peerEmpId: emp.emp_id });

      // Refresh our own DM list then navigate to the new/existing DM
      await loadDmChannels();
      selectChannel(channelId);

      return true; // signals modal to close
    } catch (err) {
      console.error('Failed to start DM:', err);
      return false;
    }
  }, [emit, selectChannel]);

  // When our peer opens a new DM with us, refresh our DM list
  useSocketEvent('dm:new', useCallback(() => {
    loadDmChannels();
  }, []));

  const handleMembersInvited = async () => {
    if (!activeChannelId) return;
    try {
      const updated = await discussService.getChannelMembers(activeChannelId);
      setMembers(updated);
    } catch (err) {
      console.error('Failed to refresh members:', err);
    }
  };

  useEffect(() => {
    if (activeChannelId) {
      setChannels(prev => prev.map(ch =>
        ch.channel_id === activeChannelId ? { ...ch, unread_count: 0 } : ch
      ));
      setDmChannels(prev => prev.map(dm =>
        dm.channel_id === activeChannelId ? { ...dm, unread_count: 0 } : dm
      ));
    }
  }, [activeChannelId]);

  const pinnedIds = useMemo(
    () => new Set(pinnedMessages.map(p => p.message_id)),
    [pinnedMessages]
  );

  // If the active channel is a DM, find the peer info for the header
  const activeDmPeer = useMemo(() =>
    activeChannel?.channel_type === 'DM'
      ? dmChannels.find(d => d.channel_id === activeChannelId) || null
      : null,
  [activeChannel, dmChannels, activeChannelId]);

  const typingNames = useMemo(() =>
    typingUsers
      .filter(id => id !== user?.emp_id)
      .map(id => members.find(m => m.emp_id === id)?.name || 'Someone')
      .slice(0, 3),
  [typingUsers, members, user?.emp_id]);

  const callParticipantNameMap = useMemo(() => {
    const map = {};
    members.forEach((member) => {
      if (member?.emp_id != null && member?.name) {
        map[String(member.emp_id)] = member.name;
      }
    });

    if (user?.emp_id != null && user?.name) {
      map[String(user.emp_id)] = user.name;
    }

    return map;
  }, [members, user?.emp_id, user?.name]);

  // ---- LIVEKIT CALL STATE ----
  const [callToken, setCallToken] = useState(null);
  const [callRoomName, setCallRoomName] = useState(null);
  const [callLivekitUrl, setCallLivekitUrl] = useState(null);
  const [callChannelId, setCallChannelId] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [callLoading, setCallLoading] = useState(false);
  const [channelHasActiveCall, setChannelHasActiveCall] = useState(false);
  const [hasLeftCallChannelId, setHasLeftCallChannelId] = useState(null); // tracks if user was in a call and left it
  const [incomingCall, setIncomingCall] = useState(null);

  // Incoming call notification from a peer who started calling
  useSocketEvent('call:incoming', useCallback((data) => {
    if (!callActive) {
      setIncomingCall(data);
    }
  }, [callActive]));

  // If everyone leaves, clear our call state
  useSocketEvent('call:ended', useCallback((data) => {
    if (data?.channelId === callChannelId && callActive) {
      // Don't force-leave — user may still be talking. LiveKit handles disconnect.
    }
    if (data?.channelId === activeChannelId) {
      setChannelHasActiveCall(false);
      setHasLeftCallChannelId(prev => prev === data.channelId ? null : prev);
    }
  }, [callChannelId, callActive, activeChannelId]));

  // If a call starts in the currently viewed channel, expose re-join affordance.
  useSocketEvent('call:started', useCallback((data) => {
    if (data?.channelId === activeChannelId) {
      setChannelHasActiveCall(true);
    }
  }, [activeChannelId]));

  const handleStartCall = useCallback(async (channelId) => {
    if (callLoading) return;
    // Already in this call — just bring panel into view (it's already showing)
    if (callActive && callChannelId === channelId) return;
    setCallLoading(true);
    try {
      const { token, roomName, livekitUrl } = await discussService.requestCallToken(channelId);
      setCallToken(token);
      setCallRoomName(roomName);
      setCallLivekitUrl(livekitUrl);
      setCallChannelId(channelId);
      setCallActive(true);
      setChannelHasActiveCall(true);
      setHasLeftCallChannelId(null); // clear re-join marker once successfully joined
    } catch (err) {
      console.error('Failed to start call:', err);
    } finally {
      setCallLoading(false);
    }
  }, [callLoading, callActive, callChannelId]);

  const handleLeaveCall = useCallback(async (isLast = false) => {
    const channelId = callChannelId;
    setHasLeftCallChannelId(channelId); // remember user was in this channel's call
    setCallActive(false);
    setCallToken(null);
    setCallRoomName(null);
    setCallChannelId(null);
    // Only end the call in DB when the last participant leaves
    if (isLast && channelId) {
      try { await discussService.endCall?.(channelId); } catch {}
    }
  }, [callChannelId]);

  // If user clicks "Voice" when already in call → leave call
  const handleCallToggle = useCallback((channelId) => {
    if (callActive && callChannelId === channelId) {
      handleLeaveCall();
    } else {
      handleStartCall(channelId);
    }
  }, [callActive, callChannelId, handleLeaveCall, handleStartCall]);

  const handleJoinIncoming = useCallback(async () => {
    if (!incomingCall) return;
    const { channelId } = incomingCall;
    setIncomingCall(null);
    selectChannel(channelId);
    handleStartCall(channelId);
  }, [incomingCall, selectChannel, handleStartCall]);

  // If user navigates here from a global incoming-call popup, resume the flow.
  useEffect(() => {
    if (!initialIncomingCall) return;

    const { channelId } = initialIncomingCall;
    if (!channelId) return;

    if (autoJoinIncoming) {
      setIncomingCall(null);
      selectChannel(channelId);
      handleStartCall(channelId);
      return;
    }

    setIncomingCall(initialIncomingCall);
  }, [initialIncomingCall, autoJoinIncoming, selectChannel, handleStartCall]);

  // Late joiner support: whenever channel changes, ask backend if a call is still active.
  useEffect(() => {
    let cancelled = false;

    const loadActiveCall = async () => {
      if (!activeChannelId) {
        setChannelHasActiveCall(false);
        return;
      }

      try {
        const status = await discussService.getActiveCall(activeChannelId);
        if (cancelled) return;
        setChannelHasActiveCall(Boolean(status?.active));
      } catch {
        if (!cancelled) setChannelHasActiveCall(false);
      }
    };

    loadActiveCall();

    return () => {
      cancelled = true;
    };
  }, [activeChannelId]);

  return (
    <div className="flex h-full bg-white overflow-hidden border-t border-gray-200">
      {/* Global incoming call notification */}
      {incomingCall && (
        <IncomingCallBanner
          callInfo={incomingCall}
          onJoin={handleJoinIncoming}
          onDismiss={() => setIncomingCall(null)}
        />
      )}

      {/* Channel Sidebar */}
      <ChannelList
        channels={channels}
        dmChannels={dmChannels}
        activeChannelId={activeChannelId}
        onSelect={selectChannel}
        onCreateClick={() => setShowCreateModal(true)}
        onBrowseClick={() => setShowBrowse(true)}
        onNewDmClick={() => setShowNewDmModal(true)}
      />

      {/* Centre: chat column + thread panel side-by-side */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Chat column — shrinks when call panel is open */}
        <div className={`flex flex-col min-w-0 transition-all duration-300 ${
          callActive && callChannelId === activeChannelId ? 'w-[55%]' : 'flex-1'
        }`}>
          {activeChannel ? (
            <>
              <ChannelHeader
                channel={activeChannel}
                memberCount={members.length}
                onMembersClick={() => setShowMembers(prev => !prev)}
                onSearchClick={() => { setShowSearch(prev => !prev); setOpenThread(null); setShowPins(false); }}
                isSearchOpen={showSearch}
                onPinsClick={() => { setShowPins(prev => !prev); setOpenThread(null); setShowSearch(false); }}
                isPinsOpen={showPins}
                pinnedCount={pinnedMessages.length}
                dmPeer={activeDmPeer}
                onCallClick={() => handleCallToggle(activeChannelId)}
                callActive={callActive && callChannelId === activeChannelId}
                callLoading={callLoading}
                callJoinable={channelHasActiveCall && !(callActive && callChannelId === activeChannelId)}
                callRejoining={hasLeftCallChannelId === activeChannelId && channelHasActiveCall && !(callActive && callChannelId === activeChannelId)}
              />

              <MessageList
                messages={messages}
                currentEmpId={user?.emp_id}
                channelId={activeChannelId}
                channelName={activeChannel?.name}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReply={handleReply}
                onPin={handlePin}
                onReact={handleReact}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loading={loading}
                highlightedMessageId={highlightedMessageId}
                pinnedIds={pinnedIds}
              />

              {/* Jump-context banner — shown when user jumped to a historical message */}
              {isJumpContext && (
                <div className="flex items-center justify-center gap-2 py-1.5 bg-amber-50 border-t border-amber-200">
                  <span className="text-xs text-amber-700">Viewing older messages</span>
                  <button
                    onClick={() => { setIsJumpContext(false); selectChannel(activeChannelId); }}
                    className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900"
                  >
                    Jump to latest ↓
                  </button>
                </div>
              )}

              {typingNames.length > 0 && (
                <div className="px-4 py-1 text-xs text-gray-400 italic">
                  {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}

              <MessageComposer
                channelId={activeChannelId}
                members={members}
                deals={deals}
                editingMessage={editingMessage}
                onCancelEdit={handleCancelEdit}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Hash className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select a channel to start chatting</p>
                <p className="text-sm mt-1">or create a new one</p>
              </div>
            </div>
          )}
        </div>

        {/* LiveKit Call Panel — appears on the right when call is active for the current channel */}
        {callActive && callChannelId === activeChannelId && callToken && (
          <div className="w-[45%] border-l border-gray-200 flex flex-col min-w-0 overflow-hidden">
            <LiveKitCallView
              livekitUrl={callLivekitUrl}
              token={callToken}
              roomName={callRoomName}
              channelName={activeChannel?.name || 'Call'}
              participantNameMap={callParticipantNameMap}
              channelId={callChannelId}
              onLeave={handleLeaveCall}
            />
          </div>
        )}

        {/* Thread Panel — slide-over within the centre area */}
        {openThread && (
          <ThreadPanel
            parentMessage={openThread}
            replies={threadReplies}
            loading={threadLoading}
            currentEmpId={user?.emp_id}
            channelId={activeChannelId}
            members={members}
            deals={deals}
            onClose={() => setOpenThread(null)}
            onDeleteReply={handleDelete}
          />
        )}

        {/* Message Search Panel — mutually exclusive with thread panel */}
        {showSearch && activeChannel && (
          <MessageSearchPanel
            channelId={activeChannelId}
            channelName={activeChannel.name}
            onClose={() => setShowSearch(false)}
            onJump={(id) => { jumpToMessage(id); setShowSearch(false); }}
          />
        )}

        {/* Pinned Messages Panel — mutually exclusive with all other panels */}
        {showPins && activeChannel && (
          <PinnedMessagesPanel
            pins={pinnedMessages}
            onClose={() => setShowPins(false)}
            onJump={(id) => { jumpToMessage(id); setShowPins(false); }}
            onUnpin={(messageId) => handlePin({ message_id: messageId })}
          />
        )}
      </div>

      {/* Members Panel */}
      {showMembers && (
        <MembersPanel
          members={members}
          channelId={activeChannelId}
          onClose={() => setShowMembers(false)}
          onInvited={handleMembersInvited}
        />
      )}

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleChannelCreated}
        />
      )}

      {/* New Direct Message Picker Modal */}
      {showNewDmModal && (
        <NewDmModal
          onClose={() => setShowNewDmModal(false)}
          onStart={handleStartDm}
          currentEmpId={user?.emp_id}
        />
      )}

      {/* Browse public channels modal */}
      {showBrowse && (
        <BrowseChannelsModal
          myChannelIds={new Set(channels.map(c => c.channel_id))}
          onClose={() => setShowBrowse(false)}
          onJoined={(ch) => {
            // Add to sidebar if not already there
            setChannels(prev => {
              if (prev.some(c => c.channel_id === ch.channel_id)) return prev;
              return [...prev, { ...ch, unread_count: 0, channel_type: 'PUBLIC' }];
            });
            // Auto-select the joined channel and close modal
            selectChannel(ch.channel_id);
            setShowBrowse(false);
          }}
        />
      )}

      {/* Invite notification banner */}
      {pendingInvite && (
        <InviteBanner
          invite={pendingInvite}
          onDismiss={() => setPendingInvite(null)}
          onJoin={() => {
            if (pendingInvite.channelId) selectChannel(pendingInvite.channelId);
            setPendingInvite(null);
          }}
        />
      )}
    </div>
  );
};

export default DiscussView;
