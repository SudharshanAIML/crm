import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Save, Loader2, AlertCircle, FlaskConical, Type, FileText,
  Search, CheckSquare, Square, Users, ChevronDown, ChevronUp
} from 'lucide-react';
import { getContacts } from '../../services/contactService';
import { getTemplates } from '../../services/emailTemplateService';
import * as abTestService from '../../services/abTestService';

const STAGE_OPTIONS = [
  { value: '', label: 'All Stages' },
  { value: 'LEAD',        label: 'Lead' },
  { value: 'MQL',         label: 'MQL' },
  { value: 'SQL',         label: 'SQL' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'CUSTOMER',    label: 'Customer' },
  { value: 'EVANGELIST',  label: 'Evangelist' },
];

const STAGE_COLOR = {
  LEAD:        'bg-gray-100 text-gray-600',
  MQL:         'bg-blue-100 text-blue-700',
  SQL:         'bg-purple-100 text-purple-700',
  OPPORTUNITY: 'bg-orange-100 text-orange-700',
  CUSTOMER:    'bg-green-100 text-green-700',
  EVANGELIST:  'bg-yellow-100 text-yellow-700',
  DORMANT:     'bg-red-100 text-red-600',
};

/* ── variant panel ───────────────────────────────── */
function VariantPanel({ label, color, subject, body, onSubjectChange, onBodyChange, templates, onApplyTemplate }) {
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className={`border-2 ${color} rounded-xl p-4 flex-1 min-w-0`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
            label === 'A' ? 'bg-sky-500' : 'bg-violet-500'
          }`}>
            {label}
          </span>
          Variant {label}
        </h4>

        {/* Template dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Use Template
          </button>
          {showTemplates && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
              {templates.length === 0 && (
                <p className="text-xs text-gray-400 p-3 text-center">No templates</p>
              )}
              {templates.map((t) => (
                <button
                  key={t.template_id}
                  type="button"
                  onClick={() => { onApplyTemplate(t); setShowTemplates(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Subject <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder={`Subject line for variant ${label}…`}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Body <span className="text-red-400">*</span></label>
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={`Email body for variant ${label}… (supports {{contact_name}}, {{employee_name}})`}
            rows={5}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 resize-y"
          />
        </div>
      </div>
    </div>
  );
}

/* ── contact selector ────────────────────────────── */
function ContactSelector({ contacts, selected, onToggle, onSelectAll, search, onSearch, stage, onStage, loading }) {
  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
  }, [contacts, search]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.contact_id));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => onStage(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
        >
          {STAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onSelectAll(filtered)}
          className="text-xs text-sky-600 hover:text-sky-800 whitespace-nowrap"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No contacts found</p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
          {filtered.map((c) => {
            const checked = selected.has(c.contact_id);
            return (
              <button
                key={c.contact_id}
                type="button"
                onClick={() => onToggle(c.contact_id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                  checked ? 'bg-sky-50 border-sky-200' : 'bg-white border-transparent hover:bg-gray-50'
                }`}
              >
                {checked ? <CheckSquare className="w-4 h-4 text-sky-500 flex-shrink-0" /> : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 truncate">{c.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STAGE_COLOR[c.status] || 'bg-gray-100 text-gray-500'}`}>
                  {c.status}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── main modal ──────────────────────────────────── */
export default function ABTestBuilderModal({ test = null, onClose, onSaved }) {
  const isEdit = !!test;

  // Form state
  const [name, setName]           = useState('');
  const [subjectA, setSubjectA]   = useState('');
  const [bodyA, setBodyA]         = useState('');
  const [subjectB, setSubjectB]   = useState('');
  const [bodyB, setBodyB]         = useState('');
  const [splitPct, setSplitPct]   = useState(50);
  const [templates, setTemplates] = useState([]);

  // Contact selection (for send step)
  const [step, setStep]               = useState(isEdit ? 'edit' : 'compose');   // compose | contacts
  const [contacts, setContacts]       = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selected, setSelected]       = useState(new Set());
  const [contactSearch, setContactSearch] = useState('');
  const [contactStage, setContactStage]   = useState('');

  // General
  const [loading, setLoading]   = useState(false);
  const [seeding, setSeeding]   = useState(isEdit);
  const [error, setError]       = useState(null);

  // Load templates
  useEffect(() => {
    getTemplates().then((res) => setTemplates(res.data || [])).catch(() => {});
  }, []);

  // Seed edit data
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await abTestService.getTest(test.test_id);
        const t = res.data;
        setName(t.name);
        setSubjectA(t.subject_a);
        setBodyA(t.body_a);
        setSubjectB(t.subject_b);
        setBodyB(t.body_b);
        setSplitPct(t.split_pct);
      } catch {
        setError('Failed to load test');
      } finally {
        setSeeding(false);
      }
    })();
  }, [isEdit, test]);

  // Load contacts when switching to contacts step
  useEffect(() => {
    if (step !== 'contacts') return;
    (async () => {
      setContactsLoading(true);
      try {
        const data = await getContacts({ status: contactStage || undefined, limit: 200 });
        setContacts(Array.isArray(data) ? data : data.contacts || []);
      } catch {
        setError('Failed to load contacts');
      } finally {
        setContactsLoading(false);
      }
    })();
  }, [step, contactStage]);

  const toggleContact = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((filtered) => {
    setSelected((prev) => {
      const allIn = filtered.every((c) => prev.has(c.contact_id));
      const next = new Set(prev);
      if (allIn) {
        filtered.forEach((c) => next.delete(c.contact_id));
      } else {
        filtered.forEach((c) => next.add(c.contact_id));
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name, subject_a: subjectA, body_a: bodyA,
        subject_b: subjectB, body_b: bodyB, split_pct: splitPct,
      };
      if (isEdit) {
        await abTestService.updateTest(test.test_id, payload);
      } else {
        await abTestService.createTest(payload);
      }
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndSend = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name, subject_a: subjectA, body_a: bodyA,
        subject_b: subjectB, body_b: bodyB, split_pct: splitPct,
      };

      let testId;
      if (isEdit) {
        await abTestService.updateTest(test.test_id, payload);
        testId = test.test_id;
      } else {
        const res = await abTestService.createTest(payload);
        testId = res.data.test_id;
      }

      await abTestService.sendTest(testId, [...selected]);
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  if (seeding) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading test…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {isEdit ? 'Edit A/B Test' : 'New A/B Test'}
              </h2>
              <p className="text-xs text-gray-400">
                {step === 'contacts' ? 'Select recipients and send' : 'Configure variant A and B'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {step === 'compose' || step === 'edit' ? (
            <>
              {/* Test name */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Test Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Subject line test — Q4 promo"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                />
              </div>

              {/* Split slider */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">
                  Traffic Split
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">A</span>
                    <span className="text-sm font-medium text-gray-700">{splitPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={splitPct}
                    onChange={(e) => setSplitPct(Number(e.target.value))}
                    className="flex-1 h-2 accent-sky-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-700">{100 - splitPct}%</span>
                    <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center">B</span>
                  </div>
                </div>
              </div>

              {/* Variants side by side */}
              <div className="flex gap-4">
                <VariantPanel
                  label="A"
                  color="border-sky-200"
                  subject={subjectA}
                  body={bodyA}
                  onSubjectChange={setSubjectA}
                  onBodyChange={setBodyA}
                  templates={templates}
                  onApplyTemplate={(t) => { setSubjectA(t.subject); setBodyA(t.body); }}
                />
                <VariantPanel
                  label="B"
                  color="border-violet-200"
                  subject={subjectB}
                  body={bodyB}
                  onSubjectChange={setSubjectB}
                  onBodyChange={setBodyB}
                  templates={templates}
                  onApplyTemplate={(t) => { setSubjectB(t.subject); setBodyB(t.body); }}
                />
              </div>
            </>
          ) : (
            /* Contact selection step */
            <>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Select Recipients ({selected.size} selected)
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Recipients will be randomly split {splitPct}% / {100 - splitPct}% between variant A and B.
              </p>
              <ContactSelector
                contacts={contacts}
                selected={selected}
                onToggle={toggleContact}
                onSelectAll={handleSelectAll}
                search={contactSearch}
                onSearch={setContactSearch}
                stage={contactStage}
                onStage={setContactStage}
                loading={contactsLoading}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {step === 'contacts' && (
              <button
                type="button"
                onClick={() => setStep('compose')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronUp className="w-4 h-4" />
                Back to Editor
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>

            {step === 'compose' || step === 'edit' ? (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => setStep('contacts')}
                  className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  Select Recipients & Send
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSaveAndSend}
                disabled={loading || selected.size < 2}
                className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                Send A/B Test ({selected.size} recipients)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
