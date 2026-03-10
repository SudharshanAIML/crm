import { useState, useEffect, useRef } from 'react';
import TemplatePicker from '../email-templates/TemplatePicker';
import { X, Minus, Maximize2, Minimize2, Send, Paperclip, Smile, Link2, Trash2, Bold, Italic, Underline, AlertCircle, ExternalLink, Loader2, Save } from 'lucide-react';
import { sendEmail, getConnectionStatus, getConnectUrl, createGmailDraft, updateGmailDraft, deleteGmailDraft, sendGmailDraft } from '../../services/emailService';
//nishithaaa
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😊', '🙂', '😉', '😍',
  '🤔', '😎', '👍', '👋', '🎉', '✨', '💯', '🔥',
  '❤️', '💪', '🙏', '👏', '🤝', '📧', '📞', '💼',
];

/**
 * Convert markdown-style links and formatting to HTML for email
 * [text](url) -> <a href="url">text</a>
 * Also converts line breaks to <br> tags
 */
const convertToHtml = (text) => {
  if (!text) return '';
  
  // Escape HTML entities first to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convert markdown links [text](url) to HTML anchors
  // Regex: \[([^\]]+)\]\(([^)]+)\)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color: #0284c7; text-decoration: underline;">$1</a>'
  );
  
  // Convert plain URLs to clickable links (if not already in anchor)
  // Match URLs that aren't already inside href=""
  html = html.replace(
    /(?<!href="|">)(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color: #0284c7; text-decoration: underline;">$1</a>'
  );
  
  // Convert line breaks to <br> tags
  html = html.replace(/\n/g, '<br>');
  
  return html;
};

//emailuuuuu
const EmailComposer = ({ 
  isOpen, 
  onClose, 
  contact,
  onSuccess,
  onDraftSaved,
  draft = null,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [emailConnected, setEmailConnected] = useState(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: '',
  });

  const fileInputRef = useRef(null);
  const bodyRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  useEffect(() => {
    if (draft) {
      setFormData({
        to: draft.to || contact?.email || '',
        subject: draft.subject || '',
        body: draft.body || '',
      });
      setCurrentDraftId(draft.draftId || null);
      setAttachments([]);
      setError(null);
    } else if (contact) {
      setFormData({
        to: contact.email || '',
        subject: '',
        body: '',
      });
      setCurrentDraftId(null);
      setAttachments([]);
      setError(null);
    }
  }, [contact, draft]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  if (!isOpen) return null;

  const handleSaveDraft = async () => {
    if (!formData.to && !formData.subject && !formData.body) {
      setError('Nothing to save — add a recipient, subject or body first');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const draftData = {
        to: formData.to,
        subject: formData.subject,
        body: formData.body,
      };
      if (currentDraftId) {
        await updateGmailDraft(currentDraftId, draftData);
      } else {
        const result = await createGmailDraft(draftData);
        setCurrentDraftId(result.draftId);
      }
      onDraftSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.to || !formData.subject || !formData.body) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert markdown-style content to HTML for proper email rendering
      const htmlBody = convertToHtml(formData.body);

      if (contact?.contact_id) {
        // Contact-scoped send — tracked, queued, stored against the contact record
        await sendEmail({
          contactId: contact.contact_id,
          subject: formData.subject,
          body: htmlBody,
          isHtml: true,
          attachments: attachments.map(({ name, type, base64 }) => ({ name, type, base64 })),
        });
      } else {
        // Free-compose (Gmail page) — use Gmail draft → send flow
        // This path works without a contactId and goes directly through the Gmail API
        const draftPayload = {
          to: formData.to,
          subject: formData.subject,
          body: htmlBody,
        };
        if (currentDraftId) {
          await updateGmailDraft(currentDraftId, draftPayload);
          await sendGmailDraft(currentDraftId);
        } else {
          const { draftId } = await createGmailDraft(draftPayload);
          await sendGmailDraft(draftId);
        }
      }

      onSuccess?.();
      onClose();
      setFormData({ to: contact?.email || '', subject: '', body: '' });
      setAttachments([]);
      setCurrentDraftId(null);
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_CONNECTED') {
        setEmailConnected(false);
      } else {
        setError(err.response?.data?.message || 'Failed to send email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleDiscard = async () => {
    if (currentDraftId) {
      try { await deleteGmailDraft(currentDraftId); } catch (_) { /* ignore */ }
    }
    setFormData({ to: contact?.email || '', subject: '', body: '' });
    setAttachments([]);
    setCurrentDraftId(null);
    onClose();
  };

  // Handle file attachment
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          size: file.size,
          type: file.type,
          base64,
        }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Insert emoji at cursor position
  const insertEmoji = (emoji) => {
    const textarea = bodyRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = formData.body.substring(0, start) + emoji + formData.body.substring(end);
      setFormData({ ...formData, body: newBody });
      
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setFormData({ ...formData, body: formData.body + emoji });
    }
    setShowEmojiPicker(false);
  };

  // Insert link
  const insertLink = () => {
    if (!linkUrl) {
      alert('Please enter a URL');
      return;
    }

    const linkHtml = linkText 
      ? `<a href="${linkUrl}">${linkText}</a>`
      : `<a href="${linkUrl}">${linkUrl}</a>`;
    
    const textarea = bodyRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const displayText = linkText || linkUrl;
      const newBody = formData.body.substring(0, start) + `[${displayText}](${linkUrl})` + formData.body.substring(end);
      setFormData({ ...formData, body: newBody });
    } else {
      setFormData({ ...formData, body: formData.body + `[${linkText || linkUrl}](${linkUrl})` });
    }

    setLinkUrl('');
    setLinkText('');
    setShowLinkDialog(false);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-0 right-6 w-72 bg-gray-800 text-white rounded-t-lg shadow-2xl z-50 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-medium truncate">New Message</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full/Maximized view
  const composerClasses = isMaximized
    ? 'fixed inset-4 md:inset-8'
    : 'fixed bottom-0 right-6 w-full max-w-lg';

  // Show connection check or not connected state
  if (checkingConnection || !emailConnected) {
    return (
      <div className={`${composerClasses} bg-white rounded-t-lg shadow-2xl z-50 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white rounded-t-lg">
          <span className="font-medium">New Message</span>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          {checkingConnection ? (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-3" />
              <p className="text-gray-600">Checking email connection...</p>
            </div>
          ) : (
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Gmail Not Connected</h3>
              <p className="text-gray-600 mb-6">
                Connect your Gmail account to send emails directly from the CRM.
              </p>
              <button
                onClick={handleConnectEmail}
                className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
              >
                Connect Gmail
                <ExternalLink className="w-4 h-4" />
              </button>
              <p className="text-xs text-gray-500 mt-4">
                You'll be redirected to Google to authorize access
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${composerClasses} bg-white rounded-t-lg shadow-2xl z-50 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white rounded-t-lg">
        <span className="font-medium">New Message</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title={isMaximized ? 'Exit full screen' : 'Full screen'}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        {/* To Field */}
        <div className="flex items-center border-b border-gray-200 px-4 py-2">
          <label className="text-gray-500 text-sm w-16">To</label>
          <input
            type="email"
            value={formData.to}
            onChange={(e) => handleChange('to', e.target.value)}
            className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
            placeholder="recipient@example.com"
          />
        </div>

        {/* Subject Field */}
        <div className="flex items-center border-b border-gray-200 px-4 py-2">
          <label className="text-gray-500 text-sm w-16">Subject </label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
            placeholder="Subject"
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <textarea
            ref={bodyRef}
            value={formData.body}
            onChange={(e) => handleChange('body', e.target.value)}
            className="w-full h-full min-h-[200px] p-4 outline-none text-sm text-gray-800 resize-none"
            placeholder="Compose email..."
          />
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                >
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 truncate max-w-[150px]">{file.name}</span>
                  <span className="text-gray-400 text-xs">({formatFileSize(file.size)})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-1">
            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || saving}
              className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  Send
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Save Draft Button */}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 ml-1 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Save as draft"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-500"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Draft
                </>
              )}
            </button>

            {/* Formatting Options */}
            <div className="flex items-center gap-1 ml-2 border-l border-gray-300 pl-2">
              {/* Attachment */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Link */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLinkDialog(!showLinkDialog)}
                  className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                  title="Insert link"
                >
                  <Link2 className="w-4 h-4" />
                </button>

                {/* Link Dialog */}
                {showLinkDialog && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                        placeholder="Link text (optional)"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowLinkDialog(false)}
                          className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={insertLink}
                          className="flex-1 px-3 py-1.5 text-sm bg-sky-500 text-white rounded hover:bg-sky-600"
                        >
                          Insert
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Emoji */}
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
                  title="Insert emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_LIST.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Template Picker */}
              <TemplatePicker
                contact={contact}
                onApply={(subject, body) => {
                  setFormData((prev) => ({ ...prev, subject, body }));
                }}
                placement="up"
              />
            </div>
          </div>

          {/* Discard Button */}
          <button
            type="button"
            onClick={handleDiscard}
            className="p-2 hover:bg-gray-200 rounded transition-colors text-gray-600"
            title="Discard"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailComposer;
