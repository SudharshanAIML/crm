import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical, Plus, Search, Loader2, AlertCircle,
  Trash2, Pencil, BarChart3, Send, Eye, MousePointerClick,
  MessageSquareReply, Trophy
} from 'lucide-react';
import * as abTestService from '../services/abTestService';
import ABTestBuilderModal from '../components/ab-tests/ABTestBuilderModal';
import ABTestResultsModal from '../components/ab-tests/ABTestResultsModal';

const STATUS_OPTIONS = [
  { value: '',          label: 'All' },
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'SENDING',   label: 'Sending' },
  { value: 'SENT',      label: 'Sent' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_STYLE = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SENDING:   'bg-blue-100 text-blue-700',
  SENT:      'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function ABTestsPage() {
  const [tests, setTests]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing]         = useState(null);
  const [viewResults, setViewResults] = useState(null);
  const [deleting, setDeleting]       = useState(null);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await abTestService.getTests({ status: statusFilter || undefined, search: search || undefined });
      setTests(res.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load A/B tests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const handleSaved = () => {
    setShowBuilder(false);
    setEditing(null);
    fetchTests();
  };

  const handleDelete = async (test) => {
    if (!confirm(`Delete "${test.name}"? This cannot be undone.`)) return;
    setDeleting(test.test_id);
    try {
      await abTestService.deleteTest(test.test_id);
      fetchTests();
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  // Stat cards summary
  const totalTests = tests.length;
  const sentTests  = tests.filter((t) => t.status === 'SENT').length;
  const draftTests = tests.filter((t) => t.status === 'DRAFT').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* ── Header ─────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">A/B Tests</h1>
                <p className="text-xs text-gray-400">Test email variants and discover what works best</p>
              </div>
            </div>
            <button
              onClick={() => { setEditing(null); setShowBuilder(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New A/B Test
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Total Tests</p>
              <p className="text-xl font-bold text-gray-900">{totalTests}</p>
            </div>
            <div className="bg-green-50 rounded-xl px-4 py-3">
              <p className="text-xs text-green-600 mb-0.5">Sent</p>
              <p className="text-xl font-bold text-green-700">{sentTests}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Drafts</p>
              <p className="text-xl font-bold text-gray-600">{draftTests}</p>
            </div>
          </div>
        </div>

        {/* ── Filters ──────────────────────────────── */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-3">
          <div className="flex-1 relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests…"
              className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
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
      </div>

      {/* ── Content ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm max-w-md mx-auto">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-16">
            <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search || statusFilter ? 'No tests match your filters' : 'No A/B tests yet'}
            </p>
            {!search && !statusFilter && (
              <button
                onClick={() => setShowBuilder(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600"
              >
                <Plus className="w-4 h-4" />
                Create your first A/B test
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tests.map((t) => (
              <div
                key={t.test_id}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{t.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      by {t.creator_name || 'Unknown'} • {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ml-2 ${STATUS_STYLE[t.status]}`}>
                    {t.status}
                  </span>
                </div>

                {/* Variants preview */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 bg-sky-50 rounded-lg px-3 py-2 min-w-0">
                    <span className="text-[10px] text-sky-500 font-bold">A</span>
                    <p className="text-xs text-gray-700 truncate mt-0.5">{t.subject_a}</p>
                  </div>
                  <div className="flex-1 bg-violet-50 rounded-lg px-3 py-2 min-w-0">
                    <span className="text-[10px] text-violet-500 font-bold">B</span>
                    <p className="text-xs text-gray-700 truncate mt-0.5">{t.subject_b}</p>
                  </div>
                </div>

                {/* Metrics row (for SENT tests) */}
                {t.status === 'SENT' && (
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-1" title="Opens">
                      <Eye className="w-3 h-3" /> {(t.opened_a || 0) + (t.opened_b || 0)}
                    </span>
                    <span className="flex items-center gap-1" title="Clicks">
                      <MousePointerClick className="w-3 h-3" /> {(t.clicked_a || 0) + (t.clicked_b || 0)}
                    </span>
                    <span className="flex items-center gap-1" title="Replies">
                      <MessageSquareReply className="w-3 h-3" /> {(t.replied_a || 0) + (t.replied_b || 0)}
                    </span>
                    <span className="flex items-center gap-1 ml-auto" title="Recipients">
                      <Send className="w-3 h-3" /> {(t.total_a || 0) + (t.total_b || 0)}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  {t.status === 'SENT' && (
                    <button
                      onClick={() => setViewResults(t)}
                      className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 font-medium"
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> Results
                    </button>
                  )}
                  {t.status === 'DRAFT' && (
                    <button
                      onClick={() => { setEditing(t); setShowBuilder(true); }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={deleting === t.test_id}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 ml-auto"
                  >
                    {deleting === t.test_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────── */}
      {showBuilder && (
        <ABTestBuilderModal
          test={editing}
          onClose={() => { setShowBuilder(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
      {viewResults && (
        <ABTestResultsModal
          test={viewResults}
          onClose={() => setViewResults(null)}
        />
      )}
    </div>
  );
}
