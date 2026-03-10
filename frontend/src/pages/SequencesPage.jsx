import { useState, useEffect, useCallback, memo } from 'react';
import {
  ListOrdered, Plus, Search, Trash2, Edit, Users, Play, Pause,
  Archive, BarChart2, ChevronRight, Loader2, AlertCircle, X,
  CheckCircle2, Clock, Mail, Eye
} from 'lucide-react';
import * as seqService from '../services/sequenceService';
import SequenceBuilderModal from '../components/sequences/SequenceBuilderModal';
import EnrollContactsModal from '../components/sequences/EnrollContactsModal';
import SequenceEnrollmentsModal from '../components/sequences/SequenceEnrollmentsModal';

/* ── constants ───────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const STATUS_STYLE = {
  DRAFT:    'bg-gray-100 text-gray-600',
  ACTIVE:   'bg-green-100 text-green-700',
  PAUSED:   'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-red-100 text-red-600',
};

/* ── stat card ───────────────────────────────────── */
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

/* ── sequence card ───────────────────────────────── */
const SequenceCard = memo(({ seq, onEdit, onDelete, onEnroll, onToggleStatus, onViewEnrollments }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stepCount = seq.step_count ?? 0;
  const enrolled  = seq.enrollment_count ?? 0;
  const completed = seq.completed_count ?? 0;
  const replied   = seq.replied_count ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-sky-300 hover:shadow-md transition-all group flex flex-col">
      <div className="p-5 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
              <ListOrdered className="w-4.5 h-4.5 text-sky-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{seq.name}</h3>
              <p className="text-xs text-gray-400">{seq.creator_name}</p>
            </div>
          </div>
          <span className={`flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[seq.status] || STATUS_STYLE.DRAFT}`}>
            {seq.status}
          </span>
        </div>

        {/* Description */}
        {seq.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{seq.description}</p>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { icon: ListOrdered, value: stepCount, label: 'Steps' },
            { icon: Users,       value: enrolled,  label: 'Enrolled' },
            { icon: CheckCircle2,value: completed, label: 'Done' },
            { icon: Mail,        value: replied,   label: 'Replied' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="bg-gray-50 rounded-lg py-1.5">
              <Icon className="w-3.5 h-3.5 text-gray-400 mx-auto mb-0.5" />
              <p className="text-sm font-semibold text-gray-800">{value}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewEnrollments(seq)}
            className="p-1.5 hover:bg-sky-50 rounded-lg transition-colors text-gray-400 hover:text-sky-600"
            title="View enrolled contacts"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => onEdit(seq)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-sky-600"
            title="Edit sequence"
          >
            <Edit className="w-4 h-4" />
          </button>

          {seq.status === 'ACTIVE' && (
            <button
              onClick={() => onEnroll(seq)}
              className="p-1.5 hover:bg-sky-50 rounded-lg transition-colors text-sky-500 hover:text-sky-700"
              title="Enroll contacts"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onToggleStatus(seq)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            title={seq.status === 'ACTIVE' ? 'Pause' : 'Activate'}
          >
            {seq.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-600">Delete?</span>
            <button
              onClick={() => onDelete(seq.sequence_id)}
              className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
});
SequenceCard.displayName = 'SequenceCard';

/* ── page ────────────────────────────────────────── */
export default function SequencesPage() {
  const [sequences, setSequences]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing]         = useState(null);   // sequence being edited
  const [enrollTarget, setEnroll]     = useState(null);   // sequence to enroll into
  const [viewTarget, setViewTarget]   = useState(null);   // sequence to view enrollments for

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await seqService.getSequences({ status: statusFilter || undefined, search: search || undefined });
      setSequences(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load sequences');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await seqService.deleteSequence(id);
      setSequences((prev) => prev.filter((s) => s.sequence_id !== id));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete');
    }
  };

  const handleToggleStatus = async (seq) => {
    const newStatus = seq.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const updated = await seqService.updateSequence(seq.sequence_id, { status: newStatus });
      setSequences((prev) => prev.map((s) => s.sequence_id === seq.sequence_id ? { ...s, status: updated.status } : s));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSaved = (seq) => {
    setSequences((prev) => {
      const exists = prev.find((s) => s.sequence_id === seq.sequence_id);
      return exists ? prev.map((s) => s.sequence_id === seq.sequence_id ? seq : s) : [seq, ...prev];
    });
    setShowBuilder(false);
    setEditing(null);
  };

  // Stats computed from loaded sequences
  const stats = {
    total:    sequences.length,
    active:   sequences.filter((s) => s.status === 'ACTIVE').length,
    enrolled: sequences.reduce((acc, s) => acc + (s.enrollment_count || 0), 0),
    replied:  sequences.reduce((acc, s) => acc + (s.replied_count || 0), 0),
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-sky-500" />
              Email Sequences
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Automate multi-touch outreach over time</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowBuilder(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Sequence
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={ListOrdered} label="Total"    value={stats.total}    color="bg-sky-500" />
          <StatCard icon={Play}        label="Active"   value={stats.active}   color="bg-green-500" />
          <StatCard icon={Users}       label="Enrolled" value={stats.enrolled} color="bg-purple-500" />
          <StatCard icon={Mail}        label="Replied"  value={stats.replied}  color="bg-orange-500" />
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sequences…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-sky-500 border-sky-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={load} className="ml-auto text-sm underline">Retry</button>
          </div>
        ) : sequences.length === 0 ? (
          <div className="text-center py-16">
            <ListOrdered className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search || statusFilter ? 'No sequences match your filters' : 'No sequences yet'}
            </p>
            {!search && !statusFilter && (
              <button
                onClick={() => { setEditing(null); setShowBuilder(true); }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600"
              >
                <Plus className="w-4 h-4" />
                Create your first sequence
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sequences.map((seq) => (
              <SequenceCard
                key={seq.sequence_id}
                seq={seq}
                onEdit={(s) => { setEditing(s); setShowBuilder(true); }}
                onDelete={handleDelete}
                onEnroll={(s) => setEnroll(s)}
                onToggleStatus={handleToggleStatus}
                onViewEnrollments={(s) => setViewTarget(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showBuilder && (
        <SequenceBuilderModal
          sequence={editing}
          onClose={() => { setShowBuilder(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {enrollTarget && (
        <EnrollContactsModal
          sequence={enrollTarget}
          onClose={() => setEnroll(null)}
          onEnrolled={() => { load(); setEnroll(null); }}
        />
      )}

      {viewTarget && (
        <SequenceEnrollmentsModal
          sequence={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}
