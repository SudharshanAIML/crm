import { memo, useState, useCallback } from 'react';
import { FileDown, Download, Filter, Calendar, Tag, ChevronDown, CheckCircle } from 'lucide-react';
import { exportContacts } from '../../services/contactService';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'MQL', label: 'MQL' },
  { value: 'SQL', label: 'SQL' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'EVANGELIST', label: 'Evangelist' },
  { value: 'DORMANT', label: 'Dormant' },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => currentYear - i);

const SelectField = memo(({ label, value, onChange, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 pr-9 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-shadow hover:border-gray-300"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    </div>
  </div>
));
SelectField.displayName = 'SelectField';

const NumberField = memo(({ label, value, onChange, min, max, placeholder }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</label>
    <input
      type="number"
      min={min}
      max={max}
      placeholder={placeholder}
      value={value || ''}
      onChange={e => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
      className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-shadow hover:border-gray-300 w-full"
    />
  </div>
));
NumberField.displayName = 'NumberField';

/**
 * ExportTab — Download contact data as CSV
 */
const ExportTab = memo(() => {
  const [params, setParams] = useState({
    period: 'monthly',
    year: currentYear,
    month: new Date().getMonth() + 1,
    quarter: Math.floor(new Date().getMonth() / 3) + 1,
    status: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const set = useCallback((key, val) => setParams(p => ({ ...p, [key]: val })), []);

  const handleDownload = useCallback(async () => {
    setError(null);
    setDone(false);
    setLoading(true);
    try {
      const payload = {
        period: params.period,
        year: params.year || undefined,
        month: params.period === 'monthly' ? params.month : undefined,
        quarter: params.period === 'quarterly' ? params.quarter : undefined,
        status: params.status || undefined,
      };
      const blob = await exportContacts(payload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${params.period}-${params.year || 'all'}${params.status ? `-${params.status.toLowerCase()}` : ''}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Export Contacts</h2>
        <p className="text-gray-500 mt-1 text-sm">Download your contact data as a CSV file filtered by period and status.</p>
      </div>

      {/* Config card */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">

        {/* Period row */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-sky-500" />
            <span className="text-sm font-semibold text-gray-700">Time Period</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['monthly','quarterly','yearly'].map(p => (
              <button
                key={p}
                onClick={() => set('period', p)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                  params.period === p
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Period parameters */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Year */}
            <SelectField label="Year" value={params.year || ''} onChange={v => set('year', v ? parseInt(v) : undefined)}>
              <option value="">All years</option>
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </SelectField>

            {/* Month — only for monthly */}
            {params.period === 'monthly' && (
              <SelectField label="Month" value={params.month || ''} onChange={v => set('month', v ? parseInt(v) : undefined)}>
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </SelectField>
            )}

            {/* Quarter — only for quarterly */}
            {params.period === 'quarterly' && (
              <SelectField label="Quarter" value={params.quarter || ''} onChange={v => set('quarter', v ? parseInt(v) : undefined)}>
                <option value={1}>Q1 (Jan – Mar)</option>
                <option value={2}>Q2 (Apr – Jun)</option>
                <option value={3}>Q3 (Jul – Sep)</option>
                <option value={4}>Q4 (Oct – Dec)</option>
              </SelectField>
            )}
          </div>
        </div>

        {/* Filter row */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-sky-500" />
            <span className="text-sm font-semibold text-gray-700">Filter by Status</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => set('status', s.value)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  params.status === s.value
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {done && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center gap-2 text-sm text-emerald-700 font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Export ready — your download should have started.
        </div>
      )}

      {/* Summary + Download */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
            <FileDown className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 capitalize">
              {params.period} export
              {params.status ? ` · ${params.status.charAt(0) + params.status.slice(1).toLowerCase()}` : ' · All statuses'}
            </p>
            <p className="text-xs text-gray-400">
              {params.period === 'monthly' && `${MONTHS[(params.month || 1) - 1]} ${params.year || 'all years'}`}
              {params.period === 'quarterly' && `Q${params.quarter || 1} ${params.year || 'all years'}`}
              {params.period === 'yearly' && (params.year ? `${params.year}` : 'All years (includes year column)')}
              {' · CSV format'}
            </p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-sky-500/25 disabled:shadow-none"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Preparing…</>
          ) : (
            <><Download className="w-4 h-4" />Download CSV</>
          )}
        </button>
      </div>
    </div>
  );
});

ExportTab.displayName = 'ExportTab';
export default ExportTab;
