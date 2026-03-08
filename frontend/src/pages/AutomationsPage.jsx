import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Plus, Search, ToggleLeft, ToggleRight, Trash2, Edit,
  Clock, CheckCircle, XCircle, AlertTriangle, BarChart3,
  ChevronDown, ChevronRight, History, Play, Filter
} from 'lucide-react';
import * as automationService from '../services/automationService';
import { useAuth } from '../context/AuthContext';

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
   STATUS BADGE
===================================================== */
const StatusBadge = memo(({ status }) => {
  const config = {
    SUCCESS: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    FAILURE: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    PARTIAL: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle },
  };
  const c = config[status] || config.FAILURE;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

/* =====================================================
   TRIGGER LABEL HELPER
===================================================== */
const triggerLabel = (type) => {
  const map = {
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
  return map[type] || type;
};

/* =====================================================
   AUTOMATION ROW
===================================================== */
const AutomationRow = memo(({ automation, onToggle, onDelete, onEdit, onViewLogs, expanded, onExpand }) => {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    if (logs.length > 0) return;
    setLogsLoading(true);
    try {
      const res = await automationService.getAutomationLogs(automation.automation_id, { limit: 5 });
      setLogs(res.logs || []);
    } catch { /* ignore */ }
    setLogsLoading(false);
  }, [automation.automation_id, logs.length]);

  useEffect(() => {
    if (expanded) loadLogs();
  }, [expanded, loadLogs]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {/* Toggle */}
        <button
          onClick={() => onToggle(automation.automation_id, !automation.is_active)}
          className="flex-shrink-0"
          title={automation.is_active ? 'Disable' : 'Enable'}
        >
          {automation.is_active ? (
            <ToggleRight className="w-8 h-5 text-green-500" />
          ) : (
            <ToggleLeft className="w-8 h-5 text-gray-400" />
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{automation.name}</h3>
            {automation.is_draft ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Draft</span>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Trigger: <span className="font-medium text-gray-700">{triggerLabel(automation.trigger_type)}</span>
            {automation.description && <span className="ml-2">— {automation.description}</span>}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Play className="w-3 h-3" />{automation.total_runs}</span>
          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" />{automation.success_runs}</span>
          <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3 h-3" />{automation.failure_runs}</span>
          {automation.last_run_at && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(automation.last_run_at).toLocaleDateString()}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={() => onExpand(automation.automation_id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Logs">
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          </button>
          <button onClick={() => onEdit(automation)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
            <Edit className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => onDelete(automation.automation_id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Expanded Logs */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent Executions</h4>
          {logsLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-gray-400">No executions yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.log_id} className="flex items-center gap-3 text-xs">
                  <StatusBadge status={log.status} />
                  <span className="text-gray-500">{new Date(log.executed_at).toLocaleString()}</span>
                  <span className="text-gray-400">{log.duration_ms}ms</span>
                  {log.error_message && <span className="text-red-500 truncate max-w-[200px]">{log.error_message}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
AutomationRow.displayName = 'AutomationRow';

/* =====================================================
   MAIN PAGE
===================================================== */
const AutomationsPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const basePath = isAdmin ? '/admin' : '';

  const [automations, setAutomations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [tab, setTab] = useState('all'); // all | active | drafts

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [autoRes, analyticsRes] = await Promise.all([
        automationService.listAutomations({ limit: 200 }),
        automationService.getAutomationAnalytics(),
      ]);
      setAutomations(autoRes.automations || []);
      setAnalytics(analyticsRes.analytics || null);
    } catch (err) {
      console.error('Failed to load automations:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = useCallback(async (id, active) => {
    try {
      await automationService.toggleAutomation(id, active);
      setAutomations(prev => prev.map(a => a.automation_id === id ? { ...a, is_active: active, is_draft: active ? false : a.is_draft } : a));
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this automation? This cannot be undone.')) return;
    try {
      await automationService.deleteAutomation(id);
      setAutomations(prev => prev.filter(a => a.automation_id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, []);

  const handleEdit = useCallback((automation) => {
    navigate(`${basePath}/automations/${automation.automation_id}/edit`);
  }, [navigate, basePath]);

  const handleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // Filter
  const filtered = automations.filter(a => {
    if (tab === 'active' && !a.is_active) return false;
    if (tab === 'drafts' && !a.is_draft) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.trigger_type.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Automations</h1>
            <p className="text-sm text-gray-500">Create workflows that run automatically on CRM events</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`${basePath}/automations/new`)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Stats */}
      {analytics?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Zap} label="Total Automations" value={analytics.summary.total_automations} color="bg-amber-500" />
          <StatCard icon={ToggleRight} label="Active" value={analytics.summary.active_count} color="bg-green-500" />
          <StatCard icon={Play} label="Total Executions" value={analytics.summary.total_executions} color="bg-blue-500" />
          <StatCard icon={XCircle} label="Failures" value={analytics.summary.total_failure} color="bg-red-500" />
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {['all', 'active', 'drafts'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search automations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {automations.length === 0 ? 'No automations yet' : 'No matching automations'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {automations.length === 0 ? 'Create your first automation to get started.' : 'Try adjusting your search or filter.'}
          </p>
          {automations.length === 0 && (
            <button
              onClick={() => navigate(`${basePath}/automations/new`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Automation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <AutomationRow
              key={a.automation_id}
              automation={a}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onViewLogs={() => {}}
              expanded={expandedId === a.automation_id}
              onExpand={handleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AutomationsPage;
