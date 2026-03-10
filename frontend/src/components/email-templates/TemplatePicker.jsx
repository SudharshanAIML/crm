/**
 * TemplatePicker.jsx
 *
 * A self-contained dropdown component for selecting and applying email
 * templates inside any compose window.
 *
 * Usage
 * ─────
 *   <TemplatePicker
 *     contact={contact}          // optional – used for interpolation
 *     onApply={(subject, body) => { … }}
 *     placement="up"             // "up" | "down"  (default: "up")
 *     buttonVariant="ghost"      // "ghost" | "outlined"
 *   />
 *
 * Template variables are resolved client-side (zero round-trip).
 * Usage counter is incremented server-side via a fire-and-forget call.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Search, Tag, ChevronRight, ChevronDown, X, Loader2, Eye, Check } from 'lucide-react';
import useEmailTemplates from '../../hooks/useEmailTemplates';
import { applyTemplate } from '../../utils/templateInterpolation';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

/* =====================================================
   CONSTANTS
===================================================== */
const CATEGORIES = [
  { value: '',              label: 'All' },
  { value: 'OUTREACH',     label: 'Outreach' },
  { value: 'FOLLOW_UP',    label: 'Follow-up' },
  { value: 'ONBOARDING',   label: 'Onboarding' },
  { value: 'MARKETING',    label: 'Marketing' },
  { value: 'NURTURE',      label: 'Nurture' },
  { value: 'RE_ENGAGEMENT',label: 'Re-engage' },
  { value: 'GENERAL',      label: 'General' },
];

const CATEGORY_BADGE = {
  OUTREACH:      'bg-blue-100 text-blue-700',
  FOLLOW_UP:     'bg-yellow-100 text-yellow-700',
  ONBOARDING:    'bg-green-100 text-green-700',
  MARKETING:     'bg-purple-100 text-purple-700',
  NURTURE:       'bg-pink-100 text-pink-700',
  RE_ENGAGEMENT: 'bg-orange-100 text-orange-700',
  GENERAL:       'bg-gray-100 text-gray-600',
};

/* =====================================================
   FIRE-AND-FORGET: record template usage
===================================================== */
const recordUsage = (templateId) => {
  api.post(`/email-templates/${templateId}/use`).catch(() => {/* silent */});
};

/* =====================================================
   TEMPLATE ROW
===================================================== */
const TemplateRow = memo(({ template, onApply, interpolatedSubject }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-sky-50 transition-colors rounded-lg cursor-pointer"
        onClick={() => onApply(template)}
      >
        {/* Icon */}
        <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-md bg-sky-100 flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-sky-600" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{template.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${CATEGORY_BADGE[template.category] || CATEGORY_BADGE.GENERAL}`}>
              {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{interpolatedSubject || template.subject}</p>
        </div>

        {/* Expand preview */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
          title="Preview body"
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Inline body preview */}
      {expanded && (
        <div className="mx-3 mb-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-600 whitespace-pre-wrap max-h-28 overflow-y-auto">
          {template.body}
        </div>
      )}
    </div>
  );
});
TemplateRow.displayName = 'TemplateRow';

/* =====================================================
   TEMPLATE PICKER
===================================================== */
const PANEL_W = 320;  // w-80 = 320px
const PANEL_H = 380;  // maxHeight
const GAP = 8;        // gap from viewport edges / trigger button

const TemplatePicker = ({
  contact = null,
  onApply,
  placement = 'up',   // kept as a hint; auto-flips if viewport space is insufficient
  buttonVariant = 'ghost',
}) => {
  const { user, company } = useAuth();
  const { templates, loading } = useEmailTemplates();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [applied, setApplied] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});

  const buttonRef = useRef(null);
  const panelRef  = useRef(null);
  const searchRef = useRef(null);

  /* ---------- Compute fixed position from button's bounding rect ----------
   * This runs every time the panel opens *and* on scroll/resize while open,
   * so the panel always tracks the button even inside fixed/transformed containers.
   * Horizontal  → left-align with button; clamp so the 320 px panel never overflows right edge.
   * Vertical    → prefer the requested placement; auto-flip if there isn't enough room.
   * ----------------------------------------------------------------------- */
  const computePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vpW  = window.innerWidth;
    const vpH  = window.innerHeight;

    // Horizontal: left-align with button, shift left if it would overflow the viewport.
    let left = rect.left;
    if (left + PANEL_W > vpW - GAP) left = vpW - PANEL_W - GAP;
    if (left < GAP) left = GAP;

    // Vertical: honour `placement` hint unless there isn't enough room.
    const wantAbove  = placement === 'up';
    const roomAbove  = rect.top - GAP;
    const roomBelow  = vpH - rect.bottom - GAP;
    const placeAbove = wantAbove
      ? roomAbove >= Math.min(PANEL_H, 200) || roomAbove > roomBelow  // prefer above if hinted & has some room
      : roomBelow < Math.min(PANEL_H, 200) && roomAbove > roomBelow;  // only go above if below has no room

    const top = placeAbove
      ? Math.max(GAP, rect.top  - PANEL_H - GAP)
      : rect.bottom + GAP;

    setPanelStyle({ left, top, width: PANEL_W, maxHeight: PANEL_H });
  }, [placement]);

  /* Recompute whenever the panel opens */
  useEffect(() => {
    if (open) computePos();
  }, [open, computePos]);

  /* Recompute on any scroll / resize while the panel is open */
  useEffect(() => {
    if (!open) return;
    const update = () => computePos();
    window.addEventListener('scroll', update, true);  // capture = catches all nested scroll
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, computePos]);

  /* ---------- Close on outside click / Escape ---------- */
  useEffect(() => {
    const handleOutside = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        panelRef.current  && !panelRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown',   handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown',   handleEsc);
    };
  }, []);

  /* ---------- Focus search when opened ---------- */
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setSearch('');
      setCategory('');
    }
  }, [open]);

  /* ---------- Filter logic (client-side, instant) ---------- */
  const filtered = templates.filter((t) => {
    if (category && t.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.subject.toLowerCase().includes(q)) return false;
    }
    return t.is_active !== false;
  });

  /* ---------- Apply handler ---------- */
  const handleApply = useCallback((template) => {
    const context = { contact, employee: user, company };
    const { subject, body } = applyTemplate(template, context);
    onApply(subject, body);
    recordUsage(template.template_id);
    setApplied(true);
    setOpen(false);
    setTimeout(() => setApplied(false), 2000);
  }, [contact, user, company, onApply]);

  /* ---------- Interpolate subject for preview ---------- */
  const buildPreviewSubject = (template) => {
    if (!contact) return template.subject;
    const { subject } = applyTemplate(template, { contact, employee: user, company });
    return subject !== template.subject ? subject : template.subject;
  };

  /* ---------- Button classes ---------- */
  const btnCls = buttonVariant === 'outlined'
    ? 'flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 hover:border-sky-400 hover:text-sky-600 rounded-lg transition-colors'
    : 'flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors';

  /* ---------- Panel – rendered via portal so it can never be clipped ---------- */
  const panel = open && createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', zIndex: 9999, ...panelStyle }}
      className="bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col overflow-hidden"
    >
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Templates</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
              />
            </div>
          </div>

          {/* Category chips – horizontally scrollable */}
          <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value === category ? '' : cat.value)}
                className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  category === cat.value
                    ? 'bg-sky-500 border-sky-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Template list */}
          <div className="flex-1 overflow-y-auto px-1 py-1">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                <p className="text-sm text-gray-500">
                  {search || category ? 'No matching templates' : 'No templates yet'}
                </p>
                {!search && !category && (
                  <a
                    href="/templates"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-sky-500 hover:underline"
                  >
                    Create your first template →
                  </a>
                )}
              </div>
            ) : (
              filtered.map((t) => (
                <TemplateRow
                  key={t.template_id}
                  template={t}
                  onApply={handleApply}
                  interpolatedSubject={buildPreviewSubject(t)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {templates.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <a
                href="/templates"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-sky-500 hover:underline"
              >
                <Tag className="w-3 h-3" />
                Manage templates ({templates.length})
              </a>
            </div>
          )}
        </div>,
    document.body
  );

  return (
    <div className="relative inline-block">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={btnCls}
        title="Insert template"
      >
        {applied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Templates</span>
      </button>

      {/* Portal panel – never clipped by any parent container */}
      {panel}
    </div>
  );
};

export default TemplatePicker;
