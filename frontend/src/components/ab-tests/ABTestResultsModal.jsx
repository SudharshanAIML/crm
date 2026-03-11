import { useState, useEffect } from 'react';
import {
  X, Loader2, AlertCircle, FlaskConical, Trophy, Mail,
  MousePointerClick, MessageSquareReply, Eye, Users, BarChart3
} from 'lucide-react';
import * as abTestService from '../../services/abTestService';

/* ── metric card ─────────────────────────────────── */
function MetricCard({ icon: Icon, label, valueA, valueB, rateA, rateB, winner }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>

      <div className="flex gap-4">
        {/* variant A */}
        <div className={`flex-1 rounded-lg p-3 ${winner === 'A' ? 'bg-sky-50 ring-2 ring-sky-300' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">A</span>
            {winner === 'A' && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
          </div>
          <p className="text-xl font-bold text-gray-900">{valueA}</p>
          <p className="text-xs text-gray-500">{rateA}%</p>
        </div>

        {/* variant B */}
        <div className={`flex-1 rounded-lg p-3 ${winner === 'B' ? 'bg-violet-50 ring-2 ring-violet-300' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center">B</span>
            {winner === 'B' && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
          </div>
          <p className="text-xl font-bold text-gray-900">{valueB}</p>
          <p className="text-xs text-gray-500">{rateB}%</p>
        </div>
      </div>
    </div>
  );
}

/* ── bar comparison ──────────────────────────────── */
function RateBar({ label, rateA, rateB }) {
  const max = Math.max(rateA, rateB, 1);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] w-6 text-right text-sky-600 font-medium">{rateA}%</span>
        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="h-full bg-sky-400 rounded-l-full transition-all" style={{ width: `${(rateA / max) * 50}%` }} />
          <div className="h-full bg-violet-400 rounded-r-full transition-all ml-auto" style={{ width: `${(rateB / max) * 50}%` }} />
        </div>
        <span className="text-[10px] w-6 text-violet-600 font-medium">{rateB}%</span>
      </div>
    </div>
  );
}

/* ── recipient table ─────────────────────────────── */
function RecipientTable({ recipients }) {
  if (!recipients?.length) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Contact</th>
            <th className="text-center text-xs font-medium text-gray-500 px-3 py-2">Variant</th>
            <th className="text-center text-xs font-medium text-gray-500 px-3 py-2">Opened</th>
            <th className="text-center text-xs font-medium text-gray-500 px-3 py-2">Clicked</th>
            <th className="text-center text-xs font-medium text-gray-500 px-3 py-2">Replied</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {recipients.map((r) => (
            <tr key={r.recipient_id} className="hover:bg-gray-50">
              <td className="px-4 py-2">
                <p className="text-sm font-medium text-gray-900 truncate">{r.name || r.contact_email || `Contact #${r.contact_id}`}</p>
                {r.email && <p className="text-xs text-gray-400 truncate">{r.email}</p>}
              </td>
              <td className="text-center px-3 py-2">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white ${
                  r.variant === 'A' ? 'bg-sky-500' : 'bg-violet-500'
                }`}>
                  {r.variant}
                </span>
              </td>
              <td className="text-center px-3 py-2">
                {r.opened ? (
                  <span className="text-green-600 text-xs font-medium">Yes</span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
              <td className="text-center px-3 py-2">
                {r.clicked ? (
                  <span className="text-green-600 text-xs font-medium">Yes</span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
              <td className="text-center px-3 py-2">
                {r.replied ? (
                  <span className="text-green-600 text-xs font-medium">Yes</span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── main modal ──────────────────────────────────── */
export default function ABTestResultsModal({ test, onClose }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [showRecipients, setShowRecipients] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await abTestService.getResults(test.test_id);
        setResults(res.data);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    })();
  }, [test.test_id]);

  const a = results?.variant_a;
  const b = results?.variant_b;
  const winner = results?.winner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{test.name}</h2>
              <p className="text-xs text-gray-400">A/B Test Results</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          ) : results && (
            <>
              {/* Winner banner */}
              {winner && winner !== 'TIE' && (
                <div className={`flex items-center gap-3 p-4 rounded-xl ${
                  winner === 'A' ? 'bg-sky-50 border border-sky-200' : 'bg-violet-50 border border-violet-200'
                }`}>
                  <Trophy className="w-6 h-6 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Variant {winner} is the winner!
                    </p>
                    <p className="text-xs text-gray-500">
                      Based on composite score (30% opens, 40% clicks, 30% replies)
                    </p>
                  </div>
                </div>
              )}
              {winner === 'TIE' && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <FlaskConical className="w-6 h-6 text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">It's a tie!</p>
                    <p className="text-xs text-gray-500">Both variants performed equally</p>
                  </div>
                </div>
              )}

              {/* Sent overview */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{(a?.sent || 0) + (b?.sent || 0)} total recipients</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-sky-500" /> A: {a?.sent || 0}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-violet-500" /> B: {b?.sent || 0}
                </span>
              </div>

              {/* Metric cards grid */}
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  icon={Eye}
                  label="Opens"
                  valueA={a?.opens || 0}
                  valueB={b?.opens || 0}
                  rateA={a?.open_rate || 0}
                  rateB={b?.open_rate || 0}
                  winner={a?.open_rate > b?.open_rate ? 'A' : b?.open_rate > a?.open_rate ? 'B' : null}
                />
                <MetricCard
                  icon={MousePointerClick}
                  label="Clicks"
                  valueA={a?.clicks || 0}
                  valueB={b?.clicks || 0}
                  rateA={a?.click_rate || 0}
                  rateB={b?.click_rate || 0}
                  winner={a?.click_rate > b?.click_rate ? 'A' : b?.click_rate > a?.click_rate ? 'B' : null}
                />
                <MetricCard
                  icon={MessageSquareReply}
                  label="Replies"
                  valueA={a?.replies || 0}
                  valueB={b?.replies || 0}
                  rateA={a?.reply_rate || 0}
                  rateB={b?.reply_rate || 0}
                  winner={a?.reply_rate > b?.reply_rate ? 'A' : b?.reply_rate > a?.reply_rate ? 'B' : null}
                />
              </div>

              {/* Rate comparison bars */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Rate Comparison <span className="text-sky-500">A</span> vs <span className="text-violet-500">B</span>
                </h4>
                <RateBar label="Open Rate" rateA={a?.open_rate || 0} rateB={b?.open_rate || 0} />
                <RateBar label="Click Rate" rateA={a?.click_rate || 0} rateB={b?.click_rate || 0} />
                <RateBar label="Reply Rate" rateA={a?.reply_rate || 0} rateB={b?.reply_rate || 0} />
              </div>

              {/* Recipients toggle */}
              <div>
                <button
                  onClick={() => setShowRecipients(!showRecipients)}
                  className="text-sm text-sky-600 hover:text-sky-800 font-medium"
                >
                  {showRecipients ? 'Hide' : 'Show'} Recipient Details ({results.recipients?.length || 0})
                </button>
                {showRecipients && (
                  <div className="mt-3">
                    <RecipientTable recipients={results.recipients} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
