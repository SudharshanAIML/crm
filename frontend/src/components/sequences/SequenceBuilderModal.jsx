import { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Save, Loader2, AlertCircle, Clock, FileText, Layers
} from 'lucide-react';
import * as seqService from '../../services/sequenceService';
import { getTemplates } from '../../services/emailTemplateService';

/* ── default blank step ─────────────────────────── */
const blankStep = () => ({
  _key: crypto.randomUUID(),  // stable React key, not sent to server
  delay_days: 0,
  subject: '',
  body: '',
  template_id: null,
});

/* ── step editor row ─────────────────────────────── */
function StepRow({ step, index, total, onChange, onRemove, onMoveUp, onMoveDown, templates }) {
  const [showTemplates, setShowTemplates] = useState(false);

  const applyTemplate = (tpl) => {
    onChange({ ...step, subject: tpl.subject, body: tpl.body, template_id: tpl.template_id });
    setShowTemplates(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Step header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-700 flex-1">Step {index + 1}</span>

        {/* Delay */}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="number"
            min="0"
            value={step.delay_days}
            onChange={(e) => onChange({ ...step, delay_days: Math.max(0, +e.target.value) })}
            className="w-14 text-sm text-center border border-gray-200 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <span className="text-xs text-gray-400">{index === 0 ? 'days after enrol' : 'days after prev'}</span>
        </div>

        {/* Reorder / delete */}
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onMoveUp}   disabled={index === 0}       className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronUp   className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total-1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={onRemove}   className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Fields */}
      <div className="p-4 space-y-3">
        {/* Template picker button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 text-xs text-sky-600 hover:underline"
          >
            <FileText className="w-3.5 h-3.5" />
            {step.template_id ? 'Change template' : 'Use a template'}
          </button>

          {showTemplates && (
            <div className="absolute top-full left-0 mt-1 z-20 w-72 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
              <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Select Template
              </div>
              {templates.length === 0 ? (
                <p className="text-xs text-gray-400 p-3">No templates found</p>
              ) : (
                templates.map((t) => (
                  <button
                    key={t.template_id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="w-full text-left px-3 py-2.5 hover:bg-sky-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                    <p className="text-xs text-gray-400 truncate">{t.subject}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Subject <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={step.subject}
            onChange={(e) => onChange({ ...step, subject: e.target.value })}
            placeholder="Email subject… (use {{contact_name}} etc.)"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Body <span className="text-red-400">*</span></label>
          <textarea
            value={step.body}
            onChange={(e) => onChange({ ...step, body: e.target.value })}
            placeholder="Email body… (use {{contact_name}}, {{employee_name}} etc.)"
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 resize-y"
          />
        </div>
      </div>
    </div>
  );
}

/* ── modal ───────────────────────────────────────── */
export default function SequenceBuilderModal({ sequence = null, onClose, onSaved }) {
  const isEdit = !!sequence;

  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [status, setStatus]       = useState('DRAFT');
  const [steps, setSteps]         = useState([blankStep()]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [seeding, setSeeding]     = useState(isEdit);   // true while fetching existing data
  const [error, setError]         = useState(null);

  // When editing, always fetch the full sequence (list rows don't include steps)
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        setSeeding(true);
        const full = await seqService.getSequence(sequence.sequence_id);
        if (cancelled) return;
        setName(full.name || '');
        setDesc(full.description || '');
        setStatus(full.status || 'DRAFT');
        if (Array.isArray(full.steps) && full.steps.length) {
          setSteps(full.steps.map((s) => ({ ...s, _key: s.step_id ? String(s.step_id) : crypto.randomUUID() })));
        } else {
          setSteps([blankStep()]);
        }
      } catch {
        if (!cancelled) setError('Failed to load sequence data');
      } finally {
        if (!cancelled) setSeeding(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence?.sequence_id]);

  // Load templates for the template picker inside step rows
  useEffect(() => {
    getTemplates().then((res) => setTemplates(res.data || [])).catch(() => {/* non-critical */});
  }, []);

  /* ── step operations ── */
  const updateStep  = useCallback((idx, updated) => setSteps((prev) => prev.map((s, i) => i === idx ? updated : s)), []);
  const removeStep  = useCallback((idx) => setSteps((prev) => prev.filter((_, i) => i !== idx)), []);
  const moveStep    = useCallback((from, to) => {
    setSteps((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }, []);

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Sequence name is required'); return; }
    if (!steps.length) { setError('Add at least one step'); return; }
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].subject.trim()) { setError(`Step ${i + 1}: subject is required`); return; }
      if (!steps[i].body.trim())    { setError(`Step ${i + 1}: body is required`); return; }
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        steps: steps.map(({ _key, ...s }) => s),   // strip UI-only key
      };

      let saved;
      if (isEdit) {
        saved = await seqService.updateSequence(sequence.sequence_id, payload);
      } else {
        saved = await seqService.createSequence(payload);
      }
      onSaved(saved);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save sequence');
    } finally {
      setLoading(false);
    }
  };

  /* ── variable hint chips ── */
  const VARIABLES = ['{{contact_name}}', '{{contact_email}}', '{{company_name}}', '{{employee_name}}'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Edit Sequence' : 'New Sequence'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seeding spinner — shown while fetching existing sequence data */}
        {seeding ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
        ) : (

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Name + Status */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Sequence Name <span className="text-red-400">*</span></label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SaaS Onboarding Flow"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
              <input
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
              />
            </div>

            {/* Variable hint */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-400">Available variables:</span>
              {VARIABLES.map((v) => (
                <code key={v} className="text-[11px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-mono border border-sky-100">{v}</code>
              ))}
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  Steps <span className="text-gray-400 font-normal">({steps.length})</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSteps((prev) => [...prev, blankStep()])}
                  className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700"
                >
                  <Plus className="w-4 h-4" />
                  Add step
                </button>
              </div>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <StepRow
                    key={step._key}
                    step={step}
                    index={i}
                    total={steps.length}
                    templates={templates}
                    onChange={(updated) => updateStep(i, updated)}
                    onRemove={() => removeStep(i)}
                    onMoveUp={() => moveStep(i, i - 1)}
                    onMoveDown={() => moveStep(i, i + 1)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Save Changes' : 'Create Sequence'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
