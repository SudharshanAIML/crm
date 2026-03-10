import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, XCircle, MinusCircle, Mail } from 'lucide-react';
import * as seqService from '../../services/sequenceService';

/* ── status config ───────────────────────────────── */
const LOG_STATUS = {
  SENT: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-50 border-green-200',
    label: 'Sent',
  },
  FAILED: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
    label: 'Failed',
  },
  SKIPPED: {
    icon: MinusCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-50 border-gray-200',
    label: 'Skipped',
  },
};

/* ── format helpers ──────────────────────────────── */
const fmtDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

/* ── log entry ───────────────────────────────────── */
function LogEntry({ entry, isLast }) {
  const cfg = LOG_STATUS[entry.status] ?? LOG_STATUS.SKIPPED;
  const Icon = cfg.icon;

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white ${cfg.bg.split(' ')[1]}`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-[20px]" />}
      </div>

      {/* Content */}
      <div className={`flex-1 mb-4 p-3 rounded-xl border text-sm ${cfg.bg}`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
              Step {entry.step_order}
            </span>
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
          </div>
          <span className="text-[11px] text-gray-400 flex-shrink-0">{fmtDateTime(entry.executed_at)}</span>
        </div>

        <p className="font-medium text-gray-800 truncate">{entry.step_subject || '(no subject)'}</p>

        {entry.status === 'FAILED' && entry.error_message && (
          <div className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{entry.error_message}</span>
          </div>
        )}

        {entry.status === 'SKIPPED' && entry.error_message && (
          <p className="mt-1 text-xs text-gray-500">{entry.error_message}</p>
        )}
      </div>
    </div>
  );
}

/* ── modal ───────────────────────────────────────── */
export default function ExecutionLogModal({ enrollment, sequence, totalSteps, onClose }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await seqService.getEnrollmentLog(sequence.sequence_id, enrollment.enrollment_id);
        if (!cancelled) setLogs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sequence.sequence_id, enrollment.enrollment_id]);

  const statusSummary = logs.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-500" />
              Email History
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-medium text-gray-600">{enrollment.contact_name}</span>
              {' · '}{sequence.name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary pills */}
        {!loading && logs.length > 0 && (
          <div className="px-6 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">
              {logs.length} of {totalSteps} step{totalSteps !== 1 ? 's' : ''} executed
            </span>
            <span className="text-gray-200">·</span>
            {Object.entries(statusSummary).map(([status, cnt]) => {
              const cfg = LOG_STATUS[status];
              if (!cfg) return null;
              return (
                <span key={status} className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${cfg.color} ${cfg.bg}`}>
                  {cnt} {cfg.label.toLowerCase()}
                </span>
              );
            })}
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Mail className="w-10 h-10 text-gray-200 mb-2" />
              <p className="text-sm">No emails sent yet</p>
              <p className="text-xs text-gray-300 mt-1">
                {enrollment.status === 'ACTIVE' ? 'Next send is scheduled.' : 'Enrollment is not active.'}
              </p>
            </div>
          ) : (
            <div className="pt-1">
              {logs.map((entry, i) => (
                <LogEntry
                  key={entry.log_id}
                  entry={entry}
                  isLast={i === logs.length - 1}
                />
              ))}

              {/* Pending steps indicator */}
              {enrollment.status === 'ACTIVE' && logs.length < totalSteps && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-white">
                      <span className="text-xs text-gray-400 font-bold">+{totalSteps - logs.length}</span>
                    </div>
                  </div>
                  <div className="flex-1 pb-1 pt-1.5">
                    <p className="text-xs text-gray-400 italic">
                      {totalSteps - logs.length} step{totalSteps - logs.length !== 1 ? 's' : ''} pending…
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
