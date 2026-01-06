import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Reply,
  Forward,
  Trash2,
  MailOpen,
  Mail,
  Star,
  Loader2,
  AlertCircle,
  User,
} from 'lucide-react';
import {
  getGmailMessage,
  markMessageRead,
  markMessageUnread,
  trashGmailMessage,
} from '../../services/emailService';

/**
 * EmailDetail Component
 * Displays full email content
 */
const EmailDetail = ({ email, onBack, onRefresh }) => {
  const [fullEmail, setFullEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (email?.id) {
      fetchFullEmail();
    }
  }, [email?.id]);

  const fetchFullEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGmailMessage(email.id);
      setFullEmail(data);
      
      // Mark as read if unread
      if (email.isUnread) {
        await markMessageRead(email.id);
      }
    } catch (err) {
      setError('Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUnread = async () => {
    try {
      setActionLoading('unread');
      await markMessageUnread(email.id);
      onRefresh?.();
      onBack?.();
    } catch (err) {
      setError('Failed to mark as unread');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTrash = async () => {
    if (!confirm('Move this email to trash?')) return;
    
    try {
      setActionLoading('trash');
      await trashGmailMessage(email.id);
      onRefresh?.();
      onBack?.();
    } catch (err) {
      setError('Failed to delete email');
    } finally {
      setActionLoading(null);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Parse email address
  const parseEmail = (emailStr) => {
    if (!emailStr) return { name: 'Unknown', email: '' };
    const match = emailStr.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2] || emailStr,
      };
    }
    return { name: emailStr.split('@')[0], email: emailStr };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-red-400" />
        <p>{error}</p>
        <button
          onClick={fetchFullEmail}
          className="mt-3 text-sky-600 hover:text-sky-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const displayEmail = fullEmail || email;
  const from = parseEmail(displayEmail.from);
  const to = parseEmail(displayEmail.to);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handleMarkUnread}
              disabled={actionLoading === 'unread'}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Mark as unread"
            >
              {actionLoading === 'unread' ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <MailOpen className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={handleTrash}
              disabled={actionLoading === 'trash'}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500 hover:text-red-600 disabled:opacity-50"
              title="Delete"
            >
              {actionLoading === 'trash' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Subject */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {displayEmail.subject || '(No subject)'}
        </h2>

        {/* From/To Info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
            {from.name?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-gray-900">{from.name}</span>
                <span className="text-gray-500 text-sm ml-2">&lt;{from.email}&gt;</span>
              </div>
              <span className="text-sm text-gray-400 flex-shrink-0">
                {formatDate(displayEmail.date)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              To: {to.name} &lt;{to.email}&gt;
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayEmail.bodyType === 'html' ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: displayEmail.body }}
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
            {displayEmail.body || displayEmail.snippet}
          </pre>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 flex items-center gap-2">
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
          <Reply className="w-4 h-4" />
          Reply
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
          <Forward className="w-4 h-4" />
          Forward
        </button>
      </div>
    </div>
  );
};

export default EmailDetail;
