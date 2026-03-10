import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Grid3X3, List, MessageSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UploadCloud, X, Download, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import ContactCard from './ContactCard';
import ContactTable from './ContactTable';
import { importContacts } from '../../services/contactService';

const ITEMS_PER_PAGE = 10;

const ContactGrid = ({ 
  contacts = [], 
  onContactSelect, 
  onEmailClick, 
  onFollowupsClick,
  onAddContact,
  onImportComplete,
  loading = false,
  activeStage = 'LEAD',
  isAdmin = false
}) => {
  const navigate = useNavigate();
  const [activeTemperature, setActiveTemperature] = useState('COLD');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [currentPage, setCurrentPage] = useState(1);

  // import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const STAGE_COLORS = {
    LEAD:        { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-200' },
    PROSPECT:    { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
    MQL:         { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    SQL:         { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200' },
    OPPORTUNITY: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200' },
    CUSTOMER:    { bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-200' },
    EVANGELIST:  { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200' },
    DORMANT:     { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200' },
  };
  const stageColor = STAGE_COLORS[activeStage] || STAGE_COLORS.LEAD;

  const SAMPLE_CSV = `name,email,phone,job_title,source,temperature,interest_score\nJohn Smith,john@example.com,9876543210,CEO,Website,HOT,80\nJane Doe,,9123456789,Manager,Referral,WARM,50`;

  const downloadSample = useCallback(() => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'contacts_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const resetImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setDragOver(false);
    setImportLoading(false);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const res = await importContacts(importFile, activeStage);
      // Backend wraps result in { message, summary } — unwrap to get the actual data
      const result = res?.summary || res;
      setImportResult(result);
      // Refresh the contact list in the parent
      if (result?.imported > 0) {
        onImportComplete?.();
      }
    } catch (err) {
      setImportResult({ error: err.response?.data?.message || err.message || 'Import failed' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) setImportFile(file);
  }, []);

  // Theme-aware colors - admin uses softer amber/warm tones
  const themeColors = isAdmin ? {
    primary: 'from-amber-500 to-orange-500',
    primaryHover: 'hover:from-amber-600 hover:to-orange-600',
    shadow: 'shadow-amber-500/20',
    shadowHover: 'hover:shadow-amber-500/25',
    ring: 'focus:ring-amber-500',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
  } : {
    primary: 'from-sky-500 to-blue-600',
    primaryHover: 'hover:from-sky-600 hover:to-blue-700',
    shadow: 'shadow-sky-500/25',
    shadowHover: 'hover:shadow-sky-500/30',
    ring: 'focus:ring-sky-500',
    text: 'text-sky-600',
    bg: 'bg-sky-50',
  };

  // Filter contacts by temperature and search
  useEffect(() => {
    let filtered = contacts.filter(
      (contact) => contact.temperature === activeTemperature
    );
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.phone?.includes(query)
      );
    }
    
    setFilteredContacts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [contacts, activeTemperature, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / ITEMS_PER_PAGE));
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContacts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredContacts, currentPage]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const temperatures = [
    { 
      value: 'HOT', 
      label: 'Hot', 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      activeColor: 'bg-red-500 text-white border-red-500',
      count: contacts.filter(c => c.temperature === 'HOT').length
    },
    { 
      value: 'WARM', 
      label: 'Warm', 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      activeColor: 'bg-orange-500 text-white border-orange-500',
      count: contacts.filter(c => c.temperature === 'WARM').length
    },
    { 
      value: 'COLD', 
      label: 'Cold', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      activeColor: 'bg-blue-500 text-white border-blue-500',
      count: contacts.filter(c => c.temperature === 'COLD').length
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        {/* Top Row - Title and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Pipeline
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {contacts.length} total contacts • {filteredContacts.length} in {activeTemperature.toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onAddContact}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r ${themeColors.primary} text-white rounded-xl font-medium ${themeColors.primaryHover} transition-all shadow-lg ${themeColors.shadow} hover:shadow-xl ${themeColors.shadowHover}`}
            >
              <Plus className="w-5 h-5" />
              <span>Add Contact</span>
            </button>
            <button
              onClick={() => { resetImportModal(); setShowImportModal(true); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import</span>
            </button>

            {/* ── Import Modal ── */}
            {showImportModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
                onClick={e => { if (e.target === e.currentTarget) setShowImportModal(false); }}
              >
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[520px] mx-auto flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

                  {/* ── Header ── */}
                  <div className="flex items-center justify-between px-7 pt-6 pb-5">
                    <div>
                      <div className="flex items-center gap-2.5 mb-0.5">
                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Import Contacts</h2>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stageColor.bg} ${stageColor.text} ${stageColor.border}`}>
                          {activeStage.charAt(0) + activeStage.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">All imported contacts will be added as <span className={`font-semibold ${stageColor.text}`}>{activeStage.charAt(0) + activeStage.slice(1).toLowerCase()}</span></p>
                    </div>
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ── Divider ── */}
                  <div className="h-px bg-gray-100 mx-7" />

                  {/* ── Scrollable body ── */}
                  <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">

                    {/* ── Result: success ── */}
                    {importResult && !importResult.error && importResult.imported > 0 && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-emerald-800">Import Successful</p>
                            <p className="text-xs text-emerald-600">
                              {importResult.imported} contact{importResult.imported !== 1 ? 's' : ''} added to the database
                            </p>
                          </div>
                        </div>
                        {importResult.failed?.length > 0 && (
                          <div className="rounded-xl border border-red-100 bg-white p-3 space-y-1.5">
                            <p className="text-xs font-semibold text-red-600">{importResult.failed.length} row(s) skipped</p>
                            <ul className="text-xs text-red-500 space-y-0.5 max-h-28 overflow-y-auto">
                              {importResult.failed.map((f, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="shrink-0 font-medium">Row {f.row}:</span>
                                  <span className="text-gray-500">{f.error}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Result: error ── */}
                    {importResult?.error && (
                      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-red-700">Import Failed</p>
                          <p className="text-xs text-red-500 mt-0.5">{importResult.error}</p>
                        </div>
                      </div>
                    )}

                    {/* ── Result: all rows failed (0 imported, has failures) ── */}
                    {importResult && !importResult.error && importResult.imported === 0 && importResult.failed?.length > 0 && (
                      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-red-700">No contacts imported</p>
                            <p className="text-xs text-red-500">All {importResult.failed.length} row(s) failed</p>
                          </div>
                        </div>
                        <ul className="text-xs text-red-500 space-y-0.5 max-h-28 overflow-y-auto rounded-xl border border-red-100 bg-white p-3">
                          {importResult.failed.map((f, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="shrink-0 font-medium">Row {f.row}:</span>
                              <span className="text-gray-500">{f.error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ── Format guide (hidden after successful result) ── */}
                    {!importResult && (
                      <>
                        {/* Required / Optional columns */}
                        <div className="rounded-2xl border border-gray-100 overflow-hidden">
                          {/* Required */}
                          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Required</p>
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-mono bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md">name</span>
                                <span className="text-xs text-gray-400">or</span>
                                <span className="inline-flex items-center gap-1 text-xs font-mono bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md">first_name</span>
                                <span className="text-xs text-gray-400">+</span>
                                <span className="inline-flex items-center gap-1 text-xs font-mono bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md">last_name</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-mono bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md">email</span>
                                <span className="text-xs text-gray-400">and / or</span>
                                <span className="inline-flex items-center gap-1 text-xs font-mono bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md">phone</span>
                                <span className="text-xs text-gray-400">— at least one</span>
                              </div>
                            </div>
                          </div>
                          {/* Optional */}
                          <div className="px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Optional</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                              {[
                                { col: 'job_title',      hint: 'any text' },
                                { col: 'status',         hint: 'LEAD · PROSPECT · CUSTOMER' },
                                { col: 'source',         hint: 'Website · Referral …' },
                                { col: 'temperature',    hint: 'HOT · WARM · COLD' },
                                { col: 'interest_score', hint: '0 – 100' },
                                { col: 'assigned_emp_id',hint: 'employee ID' },
                              ].map(({ col, hint }) => (
                                <div key={col} className="flex flex-col gap-0.5">
                                  <span className="text-xs font-mono font-medium text-gray-700">{col}</span>
                                  <span className="text-[11px] text-gray-400">{hint}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Footer note */}
                          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-[11px] text-gray-400">
                              Row 1 must be the header. Extra columns are ignored.
                              The <code className="bg-white px-1 rounded">status</code> column is ignored — all rows are imported as <span className={`font-semibold ${stageColor.text}`}>{activeStage}</span>.
                            </p>
                            <button
                              onClick={downloadSample}
                              className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-800 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Sample CSV
                            </button>
                          </div>
                        </div>

                        {/* Drop zone */}
                        <div
                          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ${
                            dragOver
                              ? 'border-amber-400 bg-amber-50/60 scale-[1.01]'
                              : importFile
                              ? 'border-emerald-400 bg-emerald-50/40'
                              : 'border-gray-200 bg-gray-50/60 hover:border-amber-300 hover:bg-amber-50/30'
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) setImportFile(f);
                              e.target.value = null;
                            }}
                          />
                          <div className="flex flex-col items-center justify-center py-8 px-6 text-center select-none">
                            {importFile ? (
                              <>
                                <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3">
                                  <FileText className="w-6 h-6 text-emerald-600" />
                                </div>
                                <p className="text-sm font-semibold text-emerald-700">{importFile.name}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {importFile.size >= 1024 * 1024
                                    ? `${(importFile.size / (1024 * 1024)).toFixed(2)} MB`
                                    : `${(importFile.size / 1024).toFixed(1)} KB`}
                                  &nbsp;·&nbsp;Click to replace
                                </p>
                              </>
                            ) : (
                              <>
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                                  dragOver ? 'bg-amber-100' : 'bg-gray-100'
                                }`}>
                                  <UploadCloud className={`w-6 h-6 transition-colors ${
                                    dragOver ? 'text-amber-500' : 'text-gray-400'
                                  }`} />
                                </div>
                                <p className="text-sm font-medium text-gray-700">
                                  Drop your file here
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  or{' '}
                                  <span className="text-amber-600 font-semibold">click to browse</span>
                                </p>
                                <p className="text-[11px] text-gray-300 mt-2">.csv and .xlsx files accepted</p>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Footer ── */}
                  <div className="h-px bg-gray-100 mx-7" />
                  <div className="flex items-center justify-between px-7 py-4">
                    <p className="text-[11px] text-gray-300">.csv and .xlsx files accepted</p>
                    <div className="flex items-center gap-2">
                      {importResult ? (
                        <button
                          onClick={() => setShowImportModal(false)}
                          className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-md shadow-amber-200"
                        >
                          Done
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowImportModal(false)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleImportSubmit}
                            disabled={!importFile || importLoading}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-200 disabled:shadow-none"
                          >
                            {importLoading ? (
                              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing…</>
                            ) : (
                              <><UploadCloud className="w-4 h-4" />Import Contacts</>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
            <button
              onClick={() => navigate(`/sessions/${activeStage.toLowerCase()}`)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Sessions</span>
            </button>
          </div>
        </div>

        {/* Temperature Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          {temperatures.map((temp) => (
            <button
              key={temp.value}
              onClick={() => setActiveTemperature(temp.value)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all border-2 ${
                activeTemperature === temp.value
                  ? temp.activeColor
                  : `${temp.bgColor} ${temp.color} ${temp.borderColor} hover:shadow-sm`
              }`}
            >
              <span>{temp.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTemperature === temp.value
                  ? 'bg-white/20'
                  : 'bg-white'
              }`}>
                {temp.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 ${themeColors.ring} focus:border-transparent transition-all text-sm`}
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? `bg-white shadow-sm ${themeColors.text}` 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Grid View"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'table' 
                  ? `bg-white shadow-sm ${themeColors.text}` 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Table View (Sortable)"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className={`w-16 h-16 border-4 ${isAdmin ? 'border-orange-100' : 'border-sky-100'} rounded-full`}></div>
              <div className={`absolute top-0 left-0 w-16 h-16 border-4 ${isAdmin ? 'border-orange-500' : 'border-sky-500'} rounded-full border-t-transparent animate-spin`}></div>
            </div>
            <p className="text-gray-500 font-medium">Loading contacts...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredContacts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No {activeTemperature.toLowerCase()} contacts
          </h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            {searchQuery 
              ? `No contacts match "${searchQuery}". Try a different search term.`
              : `Start building your pipeline by adding your first ${activeTemperature.toLowerCase()} contact.`
            }
          </p>
          {!searchQuery && (
            <button
              onClick={onAddContact}
              className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${themeColors.primary} text-white rounded-xl font-medium ${themeColors.primaryHover} transition-all shadow-lg ${themeColors.shadow}`}
            >
              <Plus className="w-5 h-5" />
              Add Your First Contact
            </button>
          )}
        </div>
      )}

      {/* Contact Grid/List/Table */}
      {!loading && filteredContacts.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto min-h-0">
          {viewMode === 'table' ? (
            <ContactTable
              contacts={paginatedContacts}
              onContactSelect={onContactSelect}
              onEmailClick={onEmailClick}
              onFollowupsClick={onFollowupsClick}
              isAdmin={isAdmin}
            />
          ) : (
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5' 
                : 'flex flex-col gap-3'
            }`}>
              {paginatedContacts.map((contact) => (
                <ContactCard
                  key={contact.contact_id}
                  contact={contact}
                  onSelect={onContactSelect}
                  onEmailClick={onEmailClick}
                  onFollowupsClick={onFollowupsClick}
                  viewMode={viewMode}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 mt-4 flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-semibold text-gray-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                {' '}–{' '}
                <span className="font-semibold text-gray-700">{Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)}</span>
                {' '}of{' '}
                <span className="font-semibold text-gray-700">{filteredContacts.length}</span>{' '}contacts
              </p>
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                {/* Previous Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers */}
                {getPageNumbers()[0] > 1 && (
                  <span className="px-1 text-gray-400 text-sm">…</span>
                )}
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${
                      currentPage === page
                        ? `bg-gradient-to-r ${themeColors.primary} text-white shadow-md ${themeColors.shadow}`
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                  <span className="px-1 text-gray-400 text-sm">…</span>
                )}

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactGrid;