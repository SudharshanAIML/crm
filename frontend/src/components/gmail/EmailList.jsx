import { Mail, FileEdit, Loader2, ChevronDown } from 'lucide-react';

/**
 * EmailList Component
 * Displays a list of emails or drafts
 */
const EmailList = ({
  emails = [],
  loading,
  isDrafts = false,
  selectedId,
  onSelect,
  onLoadMore,
  hasMore,
}) => {
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const isThisYear = date.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Parse email address to get name
  const parseEmailName = (emailStr) => {
    if (!emailStr) return 'Unknown';
    const match = emailStr.match(/^"?([^"<]+)"?\s*<?/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return emailStr.split('@')[0];
  };

  if (loading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        {isDrafts ? (
          <>
            <FileEdit className="w-12 h-12 mb-3 opacity-50" />
            <p>No drafts</p>
          </>
        ) : (
          <>
            <Mail className="w-12 h-12 mb-3 opacity-50" />
            <p>No emails</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {emails.map((email) => {
        const id = isDrafts ? email.draftId : email.id;
        const isSelected = selectedId === id;
        const isUnread = !isDrafts && email.isUnread;

        return (
          <button
            key={id}
            onClick={() => onSelect(email)}
            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
              isSelected ? 'bg-sky-50 border-l-2 border-sky-500' : ''
            } ${isUnread ? 'bg-blue-50/50' : ''}`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isUnread ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {isDrafts ? (
                  <FileEdit className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">
                    {parseEmailName(email.from)?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {isDrafts ? (email.to || 'No recipient') : parseEmailName(email.from)}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDate(email.date)}
                  </span>
                </div>
                
                <p className={`text-sm truncate mb-1 ${isUnread ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                  {email.subject || '(No subject)'}
                </p>
                
                <p className="text-xs text-gray-400 truncate">
                  {email.snippet}
                </p>
              </div>

              {/* Unread indicator */}
              {isUnread && (
                <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-2" />
              )}
            </div>
          </button>
        );
      })}

      {/* Load More */}
      {hasMore && (
        <div className="p-4 text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-sky-600 hover:bg-sky-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Load more
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailList;
