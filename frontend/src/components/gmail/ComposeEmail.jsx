import { useState, useEffect, useRef } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  sendEmail,
  createGmailDraft,
  updateGmailDraft,
  deleteGmailDraft,
  sendGmailDraft,
  getGmailDraft,
} from '../../services/emailService';

/**
 * ComposeEmail Component
 * Modal for composing new emails or editing drafts
 */
const ComposeEmail = ({
  isOpen,
  draft = null,
  contact = null,
  onClose,
  onSent,
  onDraftSaved,
  onDraftDeleted,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [formData, setFormData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
  });
  const [showCcBcc, setShowCcBcc] = useState(false);
  
  const autoSaveTimer = useRef(null);
  const bodyRef = useRef(null);

  // Initialize form data
  useEffect(() => {
    if (draft) {
      loadDraft();
    } else if (contact) {
      setFormData({
        to: contact.email || '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
      });
    } else {
      setFormData({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
      });
    }
    setCurrentDraftId(draft?.draftId || null);
    setError(null);
  }, [draft, contact]);

  // Auto-save draft
  useEffect(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Only auto-save if there's content
    if (formData.to || formData.subject || formData.body) {
      autoSaveTimer.current = setTimeout(() => {
        handleSaveDraft(true);
      }, 5000); // Auto-save after 5 seconds of inactivity
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formData]);

  const loadDraft = async () => {
    if (!draft?.draftId) return;
    
    try {
      setLoading(true);
      const fullDraft = await getGmailDraft(draft.draftId);
      setFormData({
        to: fullDraft.to || '',
        cc: '',
        bcc: '',
        subject: fullDraft.subject || '',
        body: fullDraft.body || '',
      });
      setCurrentDraftId(fullDraft.draftId);
    } catch (err) {
      setError('Failed to load draft');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSaveDraft = async (silent = false) => {
    if (!formData.to && !formData.subject && !formData.body) return;

    try {
      if (!silent) setSaving(true);
      
      const draftData = {
        to: formData.to,
        subject: formData.subject,
        body: formData.body,
        cc: formData.cc || undefined,
        bcc: formData.bcc || undefined,
      };

      if (currentDraftId) {
        await updateGmailDraft(currentDraftId, draftData);
      } else {
        const result = await createGmailDraft(draftData);
        setCurrentDraftId(result.draftId);
      }

      if (!silent) {
        onDraftSaved?.();
      }
    } catch (err) {
      if (!silent) {
        setError('Failed to save draft');
      }
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!formData.to) {
      setError('Please enter a recipient');
      return;
    }
    if (!formData.subject && !formData.body) {
      setError('Please enter a subject or message');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (currentDraftId) {
        // Update draft first, then send
        await updateGmailDraft(currentDraftId, {
          to: formData.to,
          subject: formData.subject,
          body: formData.body,
          cc: formData.cc || undefined,
          bcc: formData.bcc || undefined,
        });
        await sendGmailDraft(currentDraftId);
      } else {
        // Create draft and send
        const result = await createGmailDraft({
          to: formData.to,
          subject: formData.subject,
          body: formData.body,
          cc: formData.cc || undefined,
          bcc: formData.bcc || undefined,
        });
        await sendGmailDraft(result.draftId);
      }

      onSent?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (currentDraftId) {
      if (!confirm('Delete this draft?')) return;
      
      try {
        setLoading(true);
        await deleteGmailDraft(currentDraftId);
        onDraftDeleted?.();
        onClose();
      } catch (err) {
        setError('Failed to delete draft');
      } finally {
        setLoading(false);
      }
    } else {
      onClose();
    }
  };

  const handleDiscard = () => {
    if (formData.to || formData.subject || formData.body) {
      if (!confirm('Discard this email?')) return;
    }
    handleDelete();
  };

  if (!isOpen) return null;

  // Minimized view
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-0 right-6 w-72 bg-gray-800 text-white rounded-t-lg shadow-2xl z-50 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-medium truncate">
            {formData.subject || 'New Message'}
          </span>
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
                handleDiscard();
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

  const composerClasses = isMaximized
    ? 'fixed inset-4 md:inset-8'
    : 'fixed bottom-0 right-6 w-full max-w-xl';

  return (
    <div className={`${composerClasses} bg-white rounded-t-lg shadow-2xl z-50 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white rounded-t-lg">
        <span className="font-medium">
          {draft ? 'Edit Draft' : 'New Message'}
        </span>
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
            onClick={handleDiscard}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-t-lg">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* To Field */}
        <div className="flex items-center border-b border-gray-200 px-4 py-2">
          <label className="text-gray-500 text-sm w-12">To</label>
          <input
            type="email"
            value={formData.to}
            onChange={(e) => handleChange('to', e.target.value)}
            className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
            placeholder="recipient@example.com"
          />
          <button
            onClick={() => setShowCcBcc(!showCcBcc)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showCcBcc ? 'Hide' : 'Cc/Bcc'}
          </button>
        </div>

        {/* Cc/Bcc Fields */}
        {showCcBcc && (
          <>
            <div className="flex items-center border-b border-gray-200 px-4 py-2">
              <label className="text-gray-500 text-sm w-12">Cc</label>
              <input
                type="email"
                value={formData.cc}
                onChange={(e) => handleChange('cc', e.target.value)}
                className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
                placeholder="cc@example.com"
              />
            </div>
            <div className="flex items-center border-b border-gray-200 px-4 py-2">
              <label className="text-gray-500 text-sm w-12">Bcc</label>
              <input
                type="email"
                value={formData.bcc}
                onChange={(e) => handleChange('bcc', e.target.value)}
                className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
                placeholder="bcc@example.com"
              />
            </div>
          </>
        )}

        {/* Subject Field */}
        <div className="flex items-center border-b border-gray-200 px-4 py-2">
          <label className="text-gray-500 text-sm w-12">Subject</label>
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

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </button>

            {/* Save Draft Button */}
            <button
              onClick={() => handleSaveDraft(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComposeEmail;
