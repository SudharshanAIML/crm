import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Hash, Plus, Search, Users, X, Send, Pencil, Trash2, MessageSquare, AtSign, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket, useSocketEvent } from '../../context/SocketContext';
import * as discussService from '../../services/discussService';

/* =====================================================
   MENTION HELPERS
===================================================== */

// Render message content with styled @mentions and #deal references
const renderContent = (content) => {
  if (!content) return null;
  // Replace @[Name](emp:ID) with styled chip
  // Replace #[Deal Name](deal:ID) with styled chip
  const parts = [];
  let lastIndex = 0;
  const regex = /(?:@\[([^\]]*)\]\(emp:(\d+)\))|(?:#\[([^\]]*)\]\(deal:(\d+)\))/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
    }
    if (match[1] !== undefined) {
      // Employee mention
      parts.push(
        <span key={match.index} className="inline-flex items-center gap-0.5 bg-sky-100 text-sky-700 rounded px-1.5 py-0.5 text-xs font-medium mx-0.5">
          @{match[1]}
        </span>
      );
    } else if (match[3] !== undefined) {
      // Deal mention
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

const ChannelList = memo(({ channels, activeChannelId, onSelect, onCreateClick, collapsed }) => {
  if (collapsed) return null;

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Channels</h2>
        <button
          onClick={onCreateClick}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          title="Create channel"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Channel Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {channels.map((ch) => {
          const isActive = ch.channel_id === activeChannelId;
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
              <Hash className="w-4 h-4 flex-shrink-0" />
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
          <p className="text-xs text-gray-400 text-center py-4">No channels yet</p>
        )}
      </div>
    </div>
  );
});
ChannelList.displayName = 'ChannelList';

/* =====================================================
   CREATE CHANNEL MODAL
===================================================== */

const CreateChannelModal = memo(({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
      const result = await discussService.createChannel({ name: name.trim(), description: description.trim() });
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
   SINGLE MESSAGE BUBBLE
===================================================== */

const MessageBubble = memo(({ message, isOwn, onEdit, onDelete, onReply }) => {
  const [showActions, setShowActions] = useState(false);

  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`group flex gap-3 px-4 py-1.5 hover:bg-gray-50 transition-colors ${isOwn ? '' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
        {(message.sender_name || 'U')[0].toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-gray-900">{message.sender_name}</span>
          <span className="text-[11px] text-gray-400">{time}</span>
          {message.is_edited && <span className="text-[10px] text-gray-400">(edited)</span>}
        </div>
        <div className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
          {message.is_deleted ? (
            <span className="italic text-gray-400">This message was deleted</span>
          ) : (
            renderContent(message.content)
          )}
        </div>
      </div>

      {/* Hover Actions */}
      {showActions && !message.is_deleted && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onReply(message)} className="p-1 hover:bg-gray-200 rounded" title="Reply in thread">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {isOwn && (
            <>
              <button onClick={() => onEdit(message)} className="p-1 hover:bg-gray-200 rounded" title="Edit">
                <Pencil className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <button onClick={() => onDelete(message)} className="p-1 hover:bg-red-100 rounded" title="Delete">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </>
          )}
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

const MessageComposer = memo(({ channelId, members, deals, onSendViaSocket, editingMessage, onCancelEdit }) => {
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null); // { type: 'employee'|'deal', query: string, startIndex: number }
  const inputRef = useRef(null);
  const { emit } = useSocket();

  // Pre-fill when editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // Handle mention detection while typing
  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Check for @mention trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);

    // Look for @ or # at the end
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    const hashMatch = textBeforeCursor.match(/#(\w*)$/);

    if (atMatch) {
      setMentionQuery({ type: 'employee', query: atMatch[1].toLowerCase(), startIndex: cursorPos - atMatch[0].length });
    } else if (hashMatch) {
      setMentionQuery({ type: 'deal', query: hashMatch[1].toLowerCase(), startIndex: cursorPos - hashMatch[0].length });
    } else {
      setMentionQuery(null);
    }
  };

  // Filter items for autocomplete
  const filteredItems = useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.query;
    if (mentionQuery.type === 'employee') {
      return (members || [])
        .filter(m => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
        .slice(0, 8)
        .map(m => ({ id: m.emp_id, name: m.name, email: m.email }));
    } else {
      return (deals || [])
        .filter(d => d.product_name?.toLowerCase().includes(q))
        .slice(0, 8)
        .map(d => ({ id: d.deal_id, name: d.product_name }));
    }
  }, [mentionQuery, members, deals]);

  // Select a mention from the autocomplete
  const handleMentionSelect = (item) => {
    if (!mentionQuery) return;
    const before = text.slice(0, mentionQuery.startIndex);
    const after = text.slice(inputRef.current?.selectionStart || text.length);

    let insertion;
    if (mentionQuery.type === 'employee') {
      insertion = `@[${item.name}](emp:${item.id}) `;
    } else {
      insertion = `#[${item.name}](deal:${item.id}) `;
    }

    setText(before + insertion + after);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;

    if (editingMessage) {
      emit('message:edit', { messageId: editingMessage.message_id, content });
      onCancelEdit();
    } else {
      emit('message:send', { channelId, content }, (res) => {
        if (res?.error) console.error('Send error:', res.error);
      });
    }

    setText('');
    setMentionQuery(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      if (mentionQuery) {
        setMentionQuery(null);
      } else if (editingMessage) {
        onCancelEdit();
        setText('');
      }
    }
  };

  return (
    <div className="relative border-t border-gray-200 bg-white p-3">
      {/* Editing indicator */}
      {editingMessage && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-amber-50 rounded-lg text-sm">
          <Pencil className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-700 flex-1">Editing message</span>
          <button onClick={() => { onCancelEdit(); setText(''); }} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mention autocomplete popup */}
      <MentionPopup
        items={filteredItems}
        type={mentionQuery?.type}
        onSelect={handleMentionSelect}
        position={0}
      />

      {/* Input area */}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... Use @ to mention someone, # to reference a deal"
          rows={1}
          className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none max-h-32 overflow-y-auto"
          style={{ minHeight: '42px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1 px-1">
        <kbd className="bg-gray-100 px-1 rounded text-[10px]">Enter</kbd> to send · <kbd className="bg-gray-100 px-1 rounded text-[10px]">Shift+Enter</kbd> for newline · <kbd className="bg-gray-100 px-1 rounded text-[10px]">@</kbd> mention · <kbd className="bg-gray-100 px-1 rounded text-[10px]">#</kbd> deal
      </p>
    </div>
  );
});
MessageComposer.displayName = 'MessageComposer';

/* =====================================================
   MESSAGE LIST (with infinite scroll)
===================================================== */

const MessageList = memo(({ messages, currentEmpId, onEdit, onDelete, onReply, onLoadMore, hasMore, loading }) => {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  // Handle scroll for "load more" (scroll to top)
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    // Near bottom → enable auto-scroll
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAutoScroll(nearBottom);

    // Near top → load more
    if (el.scrollTop < 60 && hasMore && !loading) {
      prevScrollHeightRef.current = el.scrollHeight;
      onLoadMore();
    }
  };

  // Preserve scroll position after prepending older messages
  useEffect(() => {
    if (prevScrollHeightRef.current > 0 && containerRef.current) {
      const newHeight = containerRef.current.scrollHeight;
      containerRef.current.scrollTop = newHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  // Group messages by date
  const grouped = useMemo(() => {
    const groups = [];
    let lastDate = '';
    for (const msg of messages) {
      const date = new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
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
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500"></div>
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
    </div>
  );
});
MessageList.displayName = 'MessageList';

/* =====================================================
   CHANNEL HEADER
===================================================== */

const ChannelHeader = memo(({ channel, memberCount, onMembersClick, onSearchClick }) => {
  if (!channel) return null;

  return (
    <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Hash className="w-5 h-5 text-gray-400" />
        <h2 className="font-semibold text-gray-900">{channel.name}</h2>
        {channel.description && (
          <span className="text-sm text-gray-400 ml-2 hidden sm:inline">{channel.description}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onSearchClick} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Search">
          <Search className="w-4 h-4 text-gray-500" />
        </button>
        <button onClick={onMembersClick} className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Members">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">{memberCount || 0}</span>
        </button>
      </div>
    </div>
  );
});
ChannelHeader.displayName = 'ChannelHeader';

/* =====================================================
   MEMBERS PANEL (slide-over)
===================================================== */

const MembersPanel = memo(({ members, onClose }) => {
  return (
    <div className="w-64 border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">Members ({members.length})</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>
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
  );
});
MembersPanel.displayName = 'MembersPanel';

/* =====================================================
   MAIN DISCUSS COMPONENT
===================================================== */

const DiscussView = () => {
  const { user } = useAuth();
  const { socket, connected, emit } = useSocket();

  // State
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [deals, setDeals] = useState([]); // for deal mentions
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);

  // Load channels on mount
  useEffect(() => {
    loadChannels();
    loadDeals();
  }, []);

  const loadChannels = async () => {
    try {
      const data = await discussService.getMyChannels();
      setChannels(data);
      // Auto-select first channel if none selected
      if (data.length > 0 && !activeChannelId) {
        selectChannel(data[0].channel_id);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const loadDeals = async () => {
    try {
      // Try fetching company deals for mention autocomplete
      const { default: api } = await import('../../services/api');
      const { data } = await api.get('/deals/company/all');
      setDeals(Array.isArray(data) ? data : []);
    } catch {
      // Deals endpoint may not return company-wide list — that's OK
      setDeals([]);
    }
  };

  // Select a channel — load messages + members + join socket room
  const selectChannel = useCallback(async (channelId) => {
    // Leave previous channel room
    if (activeChannelId && socket) {
      emit('channel:leave', activeChannelId);
    }

    setActiveChannelId(channelId);
    setMessages([]);
    setHasMore(true);
    setEditingMessage(null);

    try {
      setLoading(true);
      const [channelData, messagesData, membersData] = await Promise.all([
        discussService.getChannel(channelId),
        discussService.getMessages(channelId),
        discussService.getChannelMembers(channelId),
      ]);

      setActiveChannel(channelData);
      setMessages(messagesData);
      setMembers(membersData);
      setHasMore(messagesData.length >= 50);

      // Join socket room
      if (socket) {
        emit('channel:join', channelId);
      }

      // Mark as read
      discussService.markChannelRead(channelId).catch(() => {});
    } catch (err) {
      console.error('Failed to load channel:', err);
    } finally {
      setLoading(false);
    }
  }, [activeChannelId, socket, emit]);

  // Load older messages (infinite scroll)
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

  /* ---------------------------------------------------
     REAL-TIME EVENT HANDLERS
  --------------------------------------------------- */

  // New message arrives
  const handleNewMessage = useCallback((msg) => {
    if (msg.channel_id === activeChannelId) {
      setMessages(prev => {
        // Deduplicate by message_id
        if (prev.some(m => m.message_id === msg.message_id)) return prev;
        return [...prev, msg];
      });
    }

    // Update unread count on other channels
    setChannels(prev =>
      prev.map(ch =>
        ch.channel_id === msg.channel_id && ch.channel_id !== activeChannelId
          ? { ...ch, unread_count: (ch.unread_count || 0) + 1 }
          : ch
      )
    );
  }, [activeChannelId]);

  const handleEditedMessage = useCallback((msg) => {
    setMessages(prev => prev.map(m => m.message_id === msg.message_id ? { ...m, ...msg } : m));
  }, []);

  const handleDeletedMessage = useCallback(({ messageId }) => {
    setMessages(prev => prev.map(m => m.message_id === messageId ? { ...m, is_deleted: true } : m));
  }, []);

  const handleTypingStart = useCallback(({ empId }) => {
    setTypingUsers(prev => {
      if (prev.includes(empId)) return prev;
      return [...prev, empId];
    });
    // Auto-clear after 3s
    setTimeout(() => {
      setTypingUsers(prev => prev.filter(id => id !== empId));
    }, 3000);
  }, []);

  const handleTypingStop = useCallback(({ empId }) => {
    setTypingUsers(prev => prev.filter(id => id !== empId));
  }, []);

  // Subscribe to socket events
  useSocketEvent('message:new', handleNewMessage);
  useSocketEvent('message:edited', handleEditedMessage);
  useSocketEvent('message:deleted', handleDeletedMessage);
  useSocketEvent('typing:start', handleTypingStart);
  useSocketEvent('typing:stop', handleTypingStop);

  /* ---------------------------------------------------
     ACTION HANDLERS
  --------------------------------------------------- */

  const handleEdit = (msg) => setEditingMessage(msg);
  const handleCancelEdit = () => setEditingMessage(null);

  const handleDelete = async (msg) => {
    if (!confirm('Delete this message?')) return;
    emit('message:delete', { messageId: msg.message_id });
  };

  const handleReply = (msg) => {
    // For now, just quote-reply by prefixing content
    // Thread support can be added later with parentMessageId
  };

  const handleChannelCreated = () => {
    loadChannels();
  };

  // Clear unread when channel is active
  useEffect(() => {
    if (activeChannelId) {
      setChannels(prev => prev.map(ch =>
        ch.channel_id === activeChannelId ? { ...ch, unread_count: 0 } : ch
      ));
    }
  }, [activeChannelId]);

  // Get typing indicator names
  const typingNames = useMemo(() => {
    return typingUsers
      .filter(id => id !== user?.emp_id)
      .map(id => members.find(m => m.emp_id === id)?.name || 'Someone')
      .slice(0, 3);
  }, [typingUsers, members, user?.emp_id]);

  return (
    <div className="flex h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Channel Sidebar */}
      <ChannelList
        channels={channels}
        activeChannelId={activeChannelId}
        onSelect={selectChannel}
        onCreateClick={() => setShowCreateModal(true)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            <ChannelHeader
              channel={activeChannel}
              memberCount={members.length}
              onMembersClick={() => setShowMembers(prev => !prev)}
              onSearchClick={() => {}}
            />

            <MessageList
              messages={messages}
              currentEmpId={user?.emp_id}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReply={handleReply}
              onLoadMore={loadMore}
              hasMore={hasMore}
              loading={loading}
            />

            {/* Typing indicator */}
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

      {/* Members Panel */}
      {showMembers && <MembersPanel members={members} onClose={() => setShowMembers(false)} />}

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleChannelCreated}
        />
      )}
    </div>
  );
};

export default DiscussView;
