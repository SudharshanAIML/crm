import { useState, useEffect } from 'react';
import { X, Loader2, Mail } from 'lucide-react';
import * as templateService from '../../services/emailTemplateService';

/* =====================================================
   TEMPLATE PREVIEW MODAL
   Shows the template with sample variables interpolated
===================================================== */
const TemplatePreviewModal = ({ template, onClose }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await templateService.previewTemplate(template.template_id);
        setPreview(res.data);
      } catch {
        // Fallback to raw template
        setPreview({
          subject: template.subject,
          body: template.body,
          variables_used: {},
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [template]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-sky-500" />
            <h2 className="text-lg font-semibold text-gray-900">Preview: {template.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            </div>
          ) : preview ? (
            <div className="space-y-5">
              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Subject</label>
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 font-medium">
                  {preview.subject}
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Body</label>
                <div className="bg-gray-50 rounded-lg px-4 py-4 text-gray-800 text-sm whitespace-pre-wrap leading-relaxed border border-gray-100">
                  {preview.body}
                </div>
              </div>

              {/* Variables used */}
              {preview.variables_used && Object.keys(preview.variables_used).length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                    Variables (sample values)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(preview.variables_used).map(([key, val]) => (
                      <span key={key} className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs">
                        <code className="font-mono">{`{{${key}}}`}</code>
                        <span className="text-sky-400">→</span>
                        <span className="font-medium">{val}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Failed to load preview.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewModal;
