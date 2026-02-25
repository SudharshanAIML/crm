import { useState, useEffect } from 'react';
import {
  Plane,
  Play,
  Square,
  Clock,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Settings,
  Activity,
} from 'lucide-react';
import {
  startAutopilot,
  stopAutopilot,
  getAutopilotStatus,
  getAutopilotLog,
  getRAGStatus,
} from '../../services/outreachService';

const AutoPilot = () => {
  const [status, setStatus] = useState(null);
  const [log, setLog] = useState([]);
  const [ragStatus, setRagStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState(null);
  const [intervalMinutes, setIntervalMinutes] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadData();
    // Refresh log every 30 seconds when active
    const interval = setInterval(() => {
      if (status?.isActive) {
        loadLog();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [status?.isActive]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusData, logData, ragData] = await Promise.all([
        getAutopilotStatus(),
        getAutopilotLog(20),
        getRAGStatus(),
      ]);
      setStatus(statusData);
      setLog(logData.log || []);
      setRagStatus(ragData);
      if (statusData.intervalMinutes) {
        setIntervalMinutes(statusData.intervalMinutes);
      }
    } catch (err) {
      setError('Failed to load autopilot status');
    } finally {
      setLoading(false);
    }
  };

  const loadLog = async () => {
    try {
      const logData = await getAutopilotLog(20);
      setLog(logData.log || []);
    } catch (err) {
      console.error('Failed to refresh log:', err);
    }
  };

  const handleToggle = async () => {
    try {
      setToggling(true);
      setError(null);

      if (status?.isActive) {
        await stopAutopilot();
      } else {
        await startAutopilot(intervalMinutes);
      }

      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle autopilot');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isActive = status?.isActive;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className={`rounded-xl border-2 p-6 transition-all ${
        isActive 
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
          : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isActive 
                ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                : 'bg-gradient-to-br from-gray-300 to-gray-400'
            }`}>
              <Plane className={`w-8 h-8 text-white ${isActive ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Auto Pilot</h2>
              <p className="text-sm text-gray-500">
                {isActive 
                  ? `Active • Checking every ${status.intervalMinutes} minutes` 
                  : 'Automatically reply to incoming emails using AI'}
              </p>
              {isActive && status.startedAt && (
                <p className="text-xs text-green-600 mt-1">
                  Started: {new Date(status.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={loadData}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                isActive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
              } disabled:opacity-50`}
            >
              {toggling ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isActive ? (
                <Square className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {isActive ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && !isActive && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Check interval:
              </label>
              <select
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>Every 1 minute</option>
                <option value={2}>Every 2 minutes</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
              </select>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* RAG Status Warning */}
      {ragStatus && !ragStatus.isConfigured && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">No company documents uploaded</p>
            <p className="text-sm text-amber-700 mt-1">
              Upload company documents in the AI Outreach tab to enable better AI-powered replies.
              Without documents, replies will use general professional language.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{log.length}</p>
              <p className="text-xs text-gray-500">Emails Processed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {log.filter(l => l.reply_sent).length}
              </p>
              <p className="text-xs text-gray-500">Replies Sent</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {log.filter(l => !l.needs_reply).length}
              </p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity Log
          </h3>
          <button
            onClick={loadLog}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {log.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No activity yet</p>
            <p className="text-sm mt-1">Start autopilot to begin processing emails</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {log.map((entry) => (
              <div key={entry.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {entry.reply_sent ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : entry.needs_reply ? (
                      <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {entry.subject || 'No Subject'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        From: {entry.sender_email}
                      </p>
                      {entry.intent && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          Intent: {entry.intent}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      entry.reply_sent
                        ? 'bg-green-100 text-green-700'
                        : entry.needs_reply
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {entry.reply_sent ? 'Replied' : entry.needs_reply ? 'Pending' : 'Skipped'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(entry.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoPilot;
