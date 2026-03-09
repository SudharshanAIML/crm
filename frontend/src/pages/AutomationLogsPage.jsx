import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Clock,
  ChevronDown, ChevronRight, Zap, Play, RefreshCw, Edit,
  GitBranch, ArrowRightCircle, Hash, Info
} from 'lucide-react';
import * as automationService from '../services/automationService';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 25;

/* =====================================================
   HELPERS
===================================================== */
const STATUS_CONFIG = {
  SUCCESS: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', Icon: CheckCircle },
  FAILURE: { bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-200',   Icon: XCircle },
  PARTIAL: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', Icon: AlertTriangle },
};

const StatusBadge = memo(({ status }) => {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.FAILURE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <c.Icon className="w-3 h-3" />
      {status}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

const TRIGGER_LABELS = {
  'contact.created': 'Contact Created',
  'contact.updated': 'Contact Updated',
  'contact.status_changed': 'Status Changed',
  'deal.stage_changed': 'Deal Stage Changed',
  'deal.won': 'Deal Won',
  'deal.lost': 'Deal Lost',
  'session.created': 'Session Booked',
  'email.opened': 'Email Opened',
  'email.clicked': 'Email Clicked',
  'feedback.submitted': 'Feedback Submitted',
  'task.created': 'Task Created',
};

const fmt = (ms) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/* =====================================================
   STEP DETAIL ROW
===================================================== */
const StepRow = memo(({ step, index }) => {
  const isCondition = step.type === 'condition';
  const ok = isCondition ? step.passed !== false : step.ok !== false;

  return (
    <div className={`flex items-start gap-3 py-2 px-3 rounded-lg text-xs ${ok ? 'bg-green-50' : 'bg-red-50'}`}>
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${ok ? 'text-green-600' : 'text-red-500'}`}>
        {isCondition
          ? <GitBranch className="w-3.5 h-3.5" />
          : ok ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">
            {isCondition ? 'Condition' : 'Action'} #{index + 1}
          </span>
          {step.action && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-mono">
              {step.action}
            </span>
          )}
          {isCondition && (
            <span className={`px-1.5 py-0.5 rounded font-medium ${step.passed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {step.passed ? 'passed' : 'skipped'}
            </span>
          )}
          <span className="ml-auto text-gray-400 flex-shrink-0">{fmt(step.ms)}</span>
        </div>
        {step.error && (
          <p className="mt-1 text-red-600 font-medium">{step.error}</p>
        )}
        {step.result && Object.keys(step.result).length > 0 && (
          <p className="mt-1 text-gray-500 font-mono text-[10px] truncate">
            {JSON.stringify(step.result)}
          </p>
        )}
      </div>
    </div>
  );
});
StepRow.displayName = 'StepRow';

/* =====================================================
   LOG ROW
===================================================== */
const LogRow = memo(({ log, isExpanded, onToggle }) => {
  const steps = log.steps || [];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-shrink-0">
          {isExpanded
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronRight className="w-4 h-4 text-gray-400" />
          }
        </div>

        <StatusBadge status={log.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-900 font-medium">
              {new Date(log.executed_at).toLocaleString()}
            </span>
            {log.trigger_entity_id && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Hash className="w-3 h-3" />Entity {log.trigger_entity_id}
              </span>
            )}
          </div>
          {log.error_message && (
            <p className="text-xs text-red-500 mt-0.5 truncate max-w-xl">{log.error_message}</p>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
          <span className="hidden sm:flex items-center gap-1">
            <Play className="w-3 h-3" />{steps.length} step{steps.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{fmt(log.duration_ms)}
          </span>
        </div>
      </button>

      {/* Expanded steps */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Step breakdown</p>
          {steps.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No step data recorded.</p>
          ) : (
            <>
              {steps.map((step, i) => <StepRow key={i} step={step} index={i} />)}
            </>
          )}
          {log.trigger_payload && Object.keys(log.trigger_payload).length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-600">
                Show trigger payload
              </summary>
              <pre className="mt-2 text-[10px] font-mono bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-600 max-h-40">
                {JSON.stringify(log.trigger_payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
});
LogRow.displayName = 'LogRow';

/* =====================================================
   MAIN PAGE
===================================================== */
const AutomationLogsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const basePath = isAdmin ? '/admin' : '';

  const [automation, setAutomation] = useState(null);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);          // 0-based
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  const fetchLogs = useCallback(async (currentPage, filter, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await automationService.getAutomationLogs(id, {
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE,
        status: filter || undefined,
      });
      setLogs(res.logs || []);
      setTotal(res.total ?? 0);
      if (res.automation) setAutomation(res.automation);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  // Initial + re-fetch when page or filter changes
  useEffect(() => {
    fetchLogs(page, statusFilter);
  }, [page, statusFilter, fetchLogs]);

  // Reset to page 0 when filter changes
  const handleFilterChange = (f) => {
    setStatusFilter(f);
    setPage(0);
    setExpandedLog(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const successRate = automation && automation.total_runs > 0
    ? Math.round((automation.success_runs / automation.total_runs) * 100)
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(`${basePath}/automations`)}
          className="mt-0.5 p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {automation ? automation.name : 'Loading…'}
            </h1>
            {automation?.is_draft && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Draft</span>
            )}
            {automation && !automation.is_draft && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${automation.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {automation.is_active ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
          {automation && (
            <p className="text-sm text-gray-500 mt-0.5">
              Trigger: <span className="font-medium text-gray-700">{TRIGGER_LABELS[automation.trigger_type] || automation.trigger_type}</span>
              {automation.description && <span className="ml-2 text-gray-400">— {automation.description}</span>}
            </p>
          )}
        </div>

        <button
          onClick={() => navigate(`${basePath}/automations/${id}/edit`)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Stats bar */}
      {automation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Runs', value: automation.total_runs ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Succeeded', value: automation.success_runs ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Failed', value: automation.failure_runs ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Success Rate', value: successRate != null ? `${successRate}%` : '—', color: successRate >= 90 ? 'text-green-600' : successRate >= 60 ? 'text-yellow-600' : 'text-red-600', bg: 'bg-gray-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 border border-gray-100`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter + refresh */}
      <div className="flex items-center gap-3">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {['', 'SUCCESS', 'FAILURE', 'PARTIAL'].map(f => (
            <button
              key={f || 'ALL'}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f || 'All'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          {total > 0 && <span>{total} execution{total !== 1 ? 's' : ''}</span>}
          <button
            onClick={() => fetchLogs(page, statusFilter, true)}
            disabled={refreshing}
            className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Zap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-600 mb-1">
            {statusFilter ? `No ${statusFilter.toLowerCase()} executions` : 'No executions yet'}
          </h3>
          <p className="text-sm text-gray-400">
            {statusFilter
              ? 'Try a different status filter.'
              : 'This automation hasn\'t run yet. Trigger the event it listens for to see logs here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <LogRow
              key={log.log_id}
              log={log}
              isExpanded={expandedLog === log.log_id}
              onToggle={() => setExpandedLog(prev => prev === log.log_id ? null : log.log_id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPage(p => p - 1); setExpandedLog(null); }}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => { setPage(p => p + 1); setExpandedLog(null); }}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationLogsPage;
