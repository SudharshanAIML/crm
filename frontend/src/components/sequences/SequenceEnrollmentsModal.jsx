import { useState, useEffect, useCallback } from 'react';
import {
  X, Users, Loader2, AlertCircle, Pause, Play,
  XCircle, History, RefreshCw, ChevronRight,
} from 'lucide-react';
import * as seqService from '../../services/sequenceService';
import ExecutionLogModal from './ExecutionLogModal';

/* ── constants ───────────────────────────────────── */
const FILTER_TABS = [
  { value: '',           label: 'All' },
  { value: 'ACTIVE',     label: 'Active' },
  { value: 'PAUSED',     label: 'Paused' },
  { value: 'COMPLETED',  label: 'Completed' },
  { value: 'REPLIED',    label: 'Replied' },
  { value: 'CANCELLED',  label: 'Cancelled' },
];

const STATUS_STYLE = {
  ACTIVE:    'bg-green-100 text-green-700',
  PAUSED:    'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  REPLIED:   'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const STAGE_STYLE = {
  LEAD:        'bg-gray-100 text-gray-600',
  MQL:         'bg-blue-100 text-blue-700',
  SQL:         'bg-purple-100 text-purple-700',
  OPPORTUNITY: 'bg-orange-100 text-orange-700',
  CUSTOMER:    'bg-green-100 text-green-700',
  EVANGELIST:  'bg-yellow-100 text-yellow-700',
  DORMANT:     'bg-red-100 text-red-600',
};

/* ── helpers ─────────────────────────────────────── */
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const fmtNextSend = (dateStr) => {
  if (!dateStr) return null;
  const d   = new Date(dateStr);
  const now = new Date();
  const ms  = d - now;
  if (ms < 0)          return 'overdue';
  if (ms < 60_000)     return 'in <1m';
  if (ms < 3_600_000)  return `in ${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `in ${Math.round(ms / 3_600_000)}h`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

/* ── enrollment row ──────────────────────────────── */
function EnrollmentRow({ enrollment, totalSteps, onPause, onResume, onCancel, onViewLog, busy }) {
  const {
    contact_name, contact_email, contact_stage,
    status, current_step, next_send_at, completed_at, pause_reason,
  } = enrollment;

  const progress = totalSteps > 0 ? Math.min((current_step / totalSteps) * 100, 100) : 0;
  const canAct   = status === 'ACTIVE' || status === 'PAUSED';

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 text-sky-700 text-sm font-semibold">
        {initials(contact_name)}
      </div>

      {/* Contact info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{contact_name}</span>
          {contact_stage && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAGE_STYLE[contact_stage] ?? STAGE_STYLE.LEAD}`}>
              {contact_stage}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{contact_email}</p>
      </div>

      {/* Progress */}
      <div className="w-28 flex-shrink-0 hidden sm:block">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-gray-500">
            Step {current_step} / {totalSteps}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Status + meta */}
      <div className="flex-shrink-0 text-right hidden md:block w-28">
        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[status] ?? STATUS_STYLE.ACTIVE}`}>
          {status}
        </span>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {status === 'ACTIVE' && next_send_at && (
            <span title={new Date(next_send_at).toLocaleString()}>
              Next: {fmtNextSend(next_send_at)}
            </span>
          )}
          {status === 'COMPLETED' && completed_at && (
            <span>Done {fmtDate(completed_at)}</span>
          )}
          {status === 'PAUSED' && pause_reason && (
            <span className="truncate max-w-[120px] block" title={pause_reason}>
              {pause_reason}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* View log */}
        <button
          onClick={onViewLog}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-sky-600 transition-colors"
          title="View email history"
        >
          <History className="w-3.5 h-3.5" />
        </button>

        {canAct && (
          <>
            {status === 'ACTIVE' ? (
              <button
                onClick={onPause}
                disabled={busy}
                className="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors disabled:opacity-40"
                title="Pause"
              >
                {busy === 'pausing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <button
                onClick={onResume}
                disabled={busy}
                className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-40"
                title="Resume"
              >
                {busy === 'resuming' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={onCancel}
              disabled={busy}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
              title="Cancel enrollment"
            >
              {busy === 'cancelling' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── modal ───────────────────────────────────────── */
export default function SequenceEnrollmentsModal({ sequence, onClose }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [statusFilter, setStatus]     = useState('');
  const [busyMap, setBusy]            = useState({});   // { enrollmentId: 'pausing'|'resuming'|'cancelling' }
  const [logTarget, setLogTarget]     = useState(null); // enrollment to view log for

  const totalSteps = sequence.step_count ?? 0;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await seqService.getEnrollments(sequence.sequence_id, {
        status: statusFilter || undefined,
      });
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  }, [sequence.sequence_id, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const setBusyFor = (id, state) =>
    setBusy((prev) => ({ ...prev, [id]: state }));
  const clearBusy  = (id) =>
    setBusy((prev) => { const n = { ...prev }; delete n[id]; return n; });

  const handlePause = async (enrollment) => {
    const id = enrollment.enrollment_id;
    setBusyFor(id, 'pausing');
    try {
      await seqService.pauseEnrollment(sequence.sequence_id, id, 'Manually paused');
      setEnrollments((prev) =>
        prev.map((e) => e.enrollment_id === id ? { ...e, status: 'PAUSED', pause_reason: 'Manually paused' } : e)
      );
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to pause');
    } finally { clearBusy(id); }
  };

  const handleResume = async (enrollment) => {
    const id = enrollment.enrollment_id;
    setBusyFor(id, 'resuming');
    try {
      await seqService.resumeEnrollment(sequence.sequence_id, id);
      setEnrollments((prev) =>
        prev.map((e) => e.enrollment_id === id ? { ...e, status: 'ACTIVE', pause_reason: null } : e)
      );
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to resume');
    } finally { clearBusy(id); }
  };

  const handleCancel = async (enrollment) => {
    if (!window.confirm(`Cancel sequence for ${enrollment.contact_name}?`)) return;
    const id = enrollment.enrollment_id;
    setBusyFor(id, 'cancelling');
    try {
      await seqService.cancelEnrollment(sequence.sequence_id, id);
      setEnrollments((prev) =>
        prev.map((e) => e.enrollment_id === id ? { ...e, status: 'CANCELLED' } : e)
      );
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to cancel');
    } finally { clearBusy(id); }
  };

  // Counts per status for tab badges
  const counts = enrollments.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const displayed = statusFilter
    ? enrollments.filter((e) => e.status === statusFilter)
    : enrollments;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500" />
                Enrollments
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Sequence: <span className="font-medium text-gray-600">{sequence.name}</span>
                {' · '}{totalSteps} step{totalSteps !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="px-6 py-2.5 border-b border-gray-100 flex gap-1.5 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const cnt = tab.value ? (counts[tab.value] ?? 0) : enrollments.length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatus(tab.value)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-sky-500 border-sky-500 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300'
                  }`}
                >
                  {tab.label}
                  {cnt > 0 && (
                    <span className={`ml-1.5 text-[10px] ${statusFilter === tab.value ? 'opacity-75' : 'text-gray-400'}`}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 m-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
                <button onClick={load} className="ml-auto text-sm underline">Retry</button>
              </div>
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Users className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-sm">
                  {statusFilter ? `No ${statusFilter.toLowerCase()} enrollments` : 'No enrollments yet'}
                </p>
              </div>
            ) : (
              <div>
                {/* Column headers */}
                <div className="hidden sm:flex items-center gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  <div className="w-9 flex-shrink-0" />
                  <div className="flex-1">Contact</div>
                  <div className="w-28 flex-shrink-0">Progress</div>
                  <div className="w-28 flex-shrink-0 text-right hidden md:block">Status</div>
                  <div className="w-20 flex-shrink-0" />
                </div>
                {displayed.map((enrollment) => (
                  <EnrollmentRow
                    key={enrollment.enrollment_id}
                    enrollment={enrollment}
                    totalSteps={totalSteps}
                    busy={busyMap[enrollment.enrollment_id] || null}
                    onPause={() => handlePause(enrollment)}
                    onResume={() => handleResume(enrollment)}
                    onCancel={() => handleCancel(enrollment)}
                    onViewLog={() => setLogTarget(enrollment)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {displayed.length} enrollment{displayed.length !== 1 ? 's' : ''}
              {statusFilter ? ` (${statusFilter.toLowerCase()})` : ' total'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Execution log drawer (rendered over this modal) */}
      {logTarget && (
        <ExecutionLogModal
          enrollment={logTarget}
          sequence={sequence}
          totalSteps={totalSteps}
          onClose={() => setLogTarget(null)}
        />
      )}
    </>
  );
}
