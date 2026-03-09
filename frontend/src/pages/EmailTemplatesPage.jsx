import { useState, useEffect, useCallback, memo } from 'react';
import {
  FileText, Plus, Search, Copy, Trash2, Edit, Eye, Tag,
  ChevronDown, X, ToggleLeft, ToggleRight, Variable
} from 'lucide-react';
import * as templateService from '../services/emailTemplateService';
import TemplateEditorModal from '../components/email-templates/TemplateEditorModal';
import TemplatePreviewModal from '../components/email-templates/TemplatePreviewModal';

/* =====================================================
   CONSTANTS
===================================================== */
const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'OUTREACH', label: 'Outreach' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'NURTURE', label: 'Nurture' },
  { value: 'RE_ENGAGEMENT', label: 'Re-engagement' },
  { value: 'GENERAL', label: 'General' },
];

const STAGE_OPTIONS = [
  { value: '', label: 'Any Stage' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'MQL', label: 'MQL' },
  { value: 'SQL', label: 'SQL' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'EVANGELIST', label: 'Evangelist' },
];

const CATEGORY_COLORS = {
  OUTREACH: 'bg-blue-100 text-blue-700',
  FOLLOW_UP: 'bg-yellow-100 text-yellow-700',
  ONBOARDING: 'bg-green-100 text-green-700',
  MARKETING: 'bg-purple-100 text-purple-700',
  NURTURE: 'bg-pink-100 text-pink-700',
  RE_ENGAGEMENT: 'bg-orange-100 text-orange-700',
  GENERAL: 'bg-gray-100 text-gray-700',
};

/* =====================================================
   STAT CARD
===================================================== */
const StatCard = memo(({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
));
StatCard.displayName = 'StatCard';

/* =====================================================
   CATEGORY BADGE
===================================================== */
const CategoryBadge = memo(({ category }) => {
  const cls = CATEGORY_COLORS[category] || CATEGORY_COLORS.GENERAL;
  const label = CATEGORIES.find(c => c.value === category)?.label || category;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Tag className="w-3 h-3" />
      {label}
    </span>
  );
});
CategoryBadge.displayName = 'CategoryBadge';

/* =====================================================
   TEMPLATE CARD
===================================================== */
const TemplateCard = memo(({ template, onEdit, onDuplicate, onDelete, onPreview }) => {
  const bodyPreview = (template.body || '').replace(/(<([^>]*?)>)/gi, '').slice(0, 120);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
            <p className="text-sm text-gray-500 truncate mt-0.5">{template.subject}</p>
          </div>
          {!template.is_active && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">Inactive</span>
          )}
        </div>

        {/* Body preview */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{bodyPreview || 'No content'}</p>

        {/* Tags row */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <CategoryBadge category={template.category} />
          {template.target_stage && (
            <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">
              {template.target_stage}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Used {template.usage_count} time{template.usage_count !== 1 ? 's' : ''}</span>
          <span>by {template.creator_name || 'Unknown'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-1 bg-gray-50/50">
        <button
          onClick={() => onPreview(template)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Preview"
        >
          <Eye className="w-4 h-4" /> Preview
        </button>
        <button
          onClick={() => onEdit(template)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit className="w-4 h-4" /> Edit
        </button>
        <button
          onClick={() => onDuplicate(template)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(template)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
TemplateCard.displayName = 'TemplateCard';

/* =====================================================
   MAIN PAGE
===================================================== */
const EmailTemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  // Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  /* ---------- Fetch templates ---------- */
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await templateService.getTemplates({
        category: categoryFilter || undefined,
        targetStage: stageFilter || undefined,
        search: search || undefined,
      });
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, stageFilter, search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  /* ---------- Handlers ---------- */
  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDuplicate = async (template) => {
    try {
      await templateService.duplicateTemplate(template.template_id);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await templateService.deleteTemplate(deleteConfirm.template_id);
      setDeleteConfirm(null);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const handleEditorClose = (saved) => {
    setEditorOpen(false);
    setEditingTemplate(null);
    if (saved) fetchTemplates();
  };

  /* ---------- Stats ---------- */
  const totalActive = templates.filter(t => t.is_active).length;
  const totalUsage = templates.reduce((s, t) => s + (t.usage_count || 0), 0);
  const categoryCounts = templates.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-sky-500" />
            Email Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create reusable email content with dynamic personalization variables
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Templates" value={templates.length} color="bg-sky-500" />
        <StatCard icon={ToggleRight} label="Active" value={totalActive} color="bg-green-500" />
        <StatCard icon={Eye} label="Total Uses" value={totalUsage} color="bg-purple-500" />
        <StatCard icon={Tag} label="Top Category" value={topCategory.replace('_', ' ')} color="bg-orange-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Stage filter */}
        <div className="relative">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          >
            {STAGE_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No templates yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first email template to speed up your outreach.</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard
              key={t.template_id}
              template={t}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={setDeleteConfirm}
              onPreview={handlePreview}
            />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={handleEditorClose}
        />
      )}

      {/* Preview Modal */}
      {previewOpen && previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => { setPreviewOpen(false); setPreviewTemplate(null); }}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Template</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesPage;
