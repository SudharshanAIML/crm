import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { X, Variable, ChevronDown, Save, Loader2 } from 'lucide-react';
import * as templateService from '../../services/emailTemplateService';

/* =====================================================
   CONSTANTS
===================================================== */
const CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'OUTREACH', label: 'Outreach' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'NURTURE', label: 'Nurture' },
  { value: 'RE_ENGAGEMENT', label: 'Re-engagement' },
];

const STAGES = [
  { value: '', label: 'Any Stage' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'MQL', label: 'MQL' },
  { value: 'SQL', label: 'SQL' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'EVANGELIST', label: 'Evangelist' },
];

/* =====================================================
   VARIABLE INSERTER - click to insert {{variable}}
===================================================== */
const VariableInserter = memo(({ variables, onInsert }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-sky-600 hover:bg-sky-50 border border-sky-200 rounded-lg transition-colors"
      >
        <Variable className="w-4 h-4" />
        Insert Variable
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-64 max-h-60 overflow-y-auto">
          {variables.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => { onInsert(v.key); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">{`{{${v.key}}}`}</span>
              <span className="block text-xs text-gray-500">{v.label} — e.g. {v.example}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
VariableInserter.displayName = 'VariableInserter';

/* =====================================================
   TEMPLATE EDITOR MODAL
===================================================== */
const TemplateEditorModal = ({ template, onClose }) => {
  const isEdit = !!template;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [variables, setVariables] = useState([]);

  // Form state
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [category, setCategory] = useState(template?.category || 'GENERAL');
  const [targetStage, setTargetStage] = useState(template?.target_stage || '');

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const activeFieldRef = useRef('body'); // which textarea last had focus

  /* ---------- Load variables ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await templateService.getVariables();
        setVariables(res.data || []);
      } catch {
        // fallback
        setVariables([
          { key: 'contact_name', label: 'Contact Name', example: 'Jane Doe' },
          { key: 'contact_email', label: 'Contact Email', example: 'jane@acme.com' },
          { key: 'company_name', label: 'Company Name', example: 'Acme Corp' },
          { key: 'employee_name', label: 'Your Name', example: 'John Smith' },
        ]);
      }
    })();
  }, []);

  /* ---------- Insert variable into the last-focused field ---------- */
  const handleInsertVariable = useCallback((key) => {
    const token = `{{${key}}}`;
    if (activeFieldRef.current === 'subject') {
      const el = subjectRef.current;
      if (el) {
        const start = el.selectionStart ?? subject.length;
        const newVal = subject.slice(0, start) + token + subject.slice(start);
        setSubject(newVal);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        });
      } else {
        setSubject((s) => s + token);
      }
    } else {
      const el = bodyRef.current;
      if (el) {
        const start = el.selectionStart ?? body.length;
        const newVal = body.slice(0, start) + token + body.slice(start);
        setBody(newVal);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        });
      } else {
        setBody((b) => b + token);
      }
    }
  }, [subject, body]);

  /* ---------- Save ---------- */
  const handleSave = async () => {
    setError('');
    if (!name.trim()) return setError('Template name is required');
    if (!subject.trim()) return setError('Subject line is required');
    if (!body.trim()) return setError('Email body is required');

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        body: body.trim(),
        category,
        targetStage: targetStage || null,
      };

      if (isEdit) {
        await templateService.updateTemplate(template.template_id, payload);
      } else {
        await templateService.createTemplate(payload);
      }

      onClose(true); // signal "saved"
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Close on Escape ---------- */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Template' : 'New Template'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome Email, Follow-up #1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            />
          </div>

          {/* Category & Stage row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Stage</label>
              <div className="relative">
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                >
                  {STAGES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Variable inserter */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Click a field, then insert a variable at the cursor:</span>
            <VariableInserter variables={variables} onInsert={handleInsertVariable} />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => { activeFieldRef.current = 'subject'; }}
              placeholder="e.g. Hi {{contact_name}}, let's connect!"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => { activeFieldRef.current = 'body'; }}
              rows={10}
              placeholder={`Hi {{contact_name}},\n\nI'm {{employee_name}} from {{company_name}}...\n\nLooking forward to hearing from you!`}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorModal;
