import { useState, useEffect } from 'react';
import { X, Send, Loader2, AlertCircle, Mail, ExternalLink } from 'lucide-react';
import { sendEmail, getConnectionStatus, getConnectUrl } from '../../services/emailService';

/**
 * EmailComposeModal
 * Modal for composing and sending emails to contacts via Gmail
 */
const EmailComposeModal = ({ isOpen, contact, onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [emailConnected, setEmailConnected] = useState(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Check email connection status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  // Reset form when contact changes
  useEffect(() => {
    if (contact) {
      setSubject('');
      setBody('');
      setCc('');
      setBcc('');
      setError(null);
    }
  }, [contact?.contact_id]);

  const checkConnection = async () => {
    try {
      setCheckingConnection(true);
      const status = await getConnectionStatus();
      setEmailConnected(status.connected);
    } catch (err) {
      setEmailConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleConnectEmail = async () => {
    try {
      const { authUrl } = await getConnectUrl();
      window.location.href = authUrl;
    } catch (err) {
      setError('Failed to initiate Gmail connection');
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Please fill in subject and message');
      return;
    }

    try {
      setSending(true);
      setError(null);

      await sendEmail({
        contactId: contact.contact_id,
        subject: subject.trim(),
        body: body.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
      });

      onSuccess?.();
      onClose();
      
      // Reset form
      setSubject('');
      setBody('');
      setCc('');
      setBcc('');
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_CONNECTED') {
        setEmailConnected(false);
      } else {
        setError(err.response?.data?.message || 'Failed to send email. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">New Email</h2>
              <p className="text-sm text-gray-500">To: {contact?.name} ({contact?.email})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Connection Check Loading */}
          {checkingConnection && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              <span className="ml-2 text-gray-600">Checking email connection...</span>
            </div>
          )}

          {/* Not Connected State */}
          {!checkingConnection && !emailConnected && (
            <div className="py-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Gmail Not Connected</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  To send emails from the CRM, you need to connect your Gmail account first.
                </p>
                <button
                  onClick={handleConnectEmail}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/25"
                >
                  Connect Gmail
                  <ExternalLink className="w-4 h-4" />
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  You'll be redirected to Google to authorize access
                </p>
              </div>
            </div>
          )}

          {/* Connected - Show Compose Form */}
          {!checkingConnection && emailConnected && (
            <div className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* CC/BCC Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-sm text-sky-600 hover:text-sky-700"
                >
                  {showCcBcc ? 'Hide' : 'Add'} Cc/Bcc
                </button>
              </div>

              {/* CC & BCC Fields */}
              {showCcBcc && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cc
                    </label>
                    <input
                      type="text"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bcc
                    </label>
                    <input
                      type="text"
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here..."
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Email Templates (Quick Insert) */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 py-1">Quick templates:</span>
                <button
                  type="button"
                  onClick={() => setBody(`Hi ${contact?.name?.split(' ')[0] || 'there'},\n\nI hope this email finds you well.\n\n`)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Greeting
                </button>
                <button
                  type="button"
                  onClick={() => setBody(prev => prev + '\n\nBest regards,\n')}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Sign-off
                </button>
                <button
                  type="button"
                  onClick={() => setBody(`Hi ${contact?.name?.split(' ')[0] || 'there'},\n\nI wanted to follow up on our previous conversation. Do you have any questions or need additional information?\n\nLooking forward to hearing from you.\n\nBest regards,\n`)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Follow-up
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!checkingConnection && emailConnected && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Email will be sent from your connected Gmail account
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !body.trim()}
                className="px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailComposeModal;
