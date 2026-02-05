/**
 * Page Responses Page
 * View and manage form responses for a landing page
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Download,
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  Mail,
  User,
  Calendar,
  ChevronDown,
  X
} from 'lucide-react';
import * as pagesService from '../services/pagesService';

// Status configuration
const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', icon: Clock },
  viewed: { label: 'Viewed', color: 'bg-gray-100 text-gray-600', icon: Eye },
  contacted: { label: 'Contacted', color: 'bg-amber-100 text-amber-700', icon: Mail },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700', icon: CheckCircle }
};

export default function PageResponsesPage() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [page, setPage] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // UI state
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  
  const basePath = isAdmin ? '/admin' : '';
  
  // Load page and responses
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pageData, responsesData] = await Promise.all([
        pagesService.getPage(pageId),
        pagesService.getPageResponses(pageId, {
          status: statusFilter !== 'all' ? statusFilter : undefined
        })
      ]);
      
      setPage(pageData);
      setResponses(responsesData.responses || []);
    } catch (err) {
      setError('Failed to load responses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pageId, statusFilter]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Filter responses client-side
  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      const formDataStr = JSON.stringify(response.form_data || {}).toLowerCase();
      const matchesSearch = !searchQuery || formDataStr.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || response.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [responses, searchQuery, statusFilter]);
  
  // Get stats
  const stats = useMemo(() => {
    return {
      total: responses.length,
      new: responses.filter(r => r.status === 'new').length,
      viewed: responses.filter(r => r.status === 'viewed').length,
      contacted: responses.filter(r => r.status === 'contacted').length,
      converted: responses.filter(r => r.status === 'converted').length
    };
  }, [responses]);
  
  // Mark as viewed when opening
  const handleViewResponse = async (response) => {
    setSelectedResponse(response);
    
    if (response.status === 'new') {
      try {
        await pagesService.updateResponseStatus(pageId, response.response_id, 'viewed');
        setResponses(prev => prev.map(r => 
          r.response_id === response.response_id ? { ...r, status: 'viewed' } : r
        ));
      } catch (err) {
        console.error('Failed to mark as viewed:', err);
      }
    }
  };
  
  // Update status
  const handleUpdateStatus = async (responseId, newStatus) => {
    try {
      await pagesService.updateResponseStatus(pageId, responseId, newStatus);
      setResponses(prev => prev.map(r => 
        r.response_id === responseId ? { ...r, status: newStatus } : r
      ));
      if (selectedResponse?.response_id === responseId) {
        setSelectedResponse(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };
  
  // Delete response
  const handleDeleteResponse = async (responseId) => {
    if (!confirm('Delete this response?')) return;
    
    setDeletingId(responseId);
    try {
      await pagesService.deleteResponse(pageId, responseId);
      setResponses(prev => prev.filter(r => r.response_id !== responseId));
      if (selectedResponse?.response_id === responseId) {
        setSelectedResponse(null);
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeletingId(null);
    }
  };
  
  // Export to CSV
  const handleExport = () => {
    if (responses.length === 0) return;
    
    // Get all unique field names
    const allFields = new Set();
    responses.forEach(r => {
      Object.keys(r.form_data || {}).forEach(key => allFields.add(key));
    });
    
    const fields = ['submitted_at', 'status', ...Array.from(allFields)];
    
    // Build CSV
    const csvRows = [fields.join(',')];
    
    responses.forEach(response => {
      const row = fields.map(field => {
        if (field === 'submitted_at') {
          return new Date(response.submitted_at).toISOString();
        }
        if (field === 'status') {
          return response.status;
        }
        const value = response.form_data?.[field] || '';
        // Escape commas and quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });
    
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page?.slug || 'responses'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(`${basePath}/pages`)}
            className="p-2 hover:bg-gray-200 rounded-lg text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">Form Responses</h1>
            {page && (
              <p className="text-gray-500">{page.title}</p>
            )}
          </div>
          
          <button
            onClick={handleExport}
            disabled={responses.length === 0}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-gray-700 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="New" value={stats.new} color="blue" />
          <StatCard label="Viewed" value={stats.viewed} color="gray" />
          <StatCard label="Contacted" value={stats.contacted} color="amber" />
          <StatCard label="Converted" value={stats.converted} color="green" />
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search responses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="viewed">Viewed</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>
        
        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {/* Responses Table */}
        {filteredResponses.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No responses yet</h3>
            <p className="text-gray-500">
              Form submissions will appear here when visitors submit forms on your page.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Submitted</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Preview</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResponses.map((response) => {
                  const StatusIcon = STATUS_CONFIG[response.status]?.icon || Clock;
                  const preview = getResponsePreview(response.form_data);
                  
                  return (
                    <tr 
                      key={response.response_id}
                      className={`hover:bg-gray-50 ${deletingId === response.response_id ? 'opacity-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[response.status]?.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_CONFIG[response.status]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(response.submitted_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">
                        {preview}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewResponse(response)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteResponse(response.response_id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Response Detail Modal */}
      {selectedResponse && (
        <ResponseDetailModal
          response={selectedResponse}
          onClose={() => setSelectedResponse(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteResponse}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    gray: 'bg-gray-50 border-gray-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200'
  };
  
  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color] || 'bg-white border-gray-200'}`}>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function getResponsePreview(formData) {
  if (!formData) return 'No data';
  
  const entries = Object.entries(formData);
  if (entries.length === 0) return 'No data';
  
  // Try to find name or email first
  const nameKey = entries.find(([k]) => k.toLowerCase().includes('name'));
  const emailKey = entries.find(([k]) => k.toLowerCase().includes('email'));
  
  if (nameKey && emailKey) {
    return `${nameKey[1]} - ${emailKey[1]}`;
  }
  if (nameKey) return String(nameKey[1]);
  if (emailKey) return String(emailKey[1]);
  
  // Fall back to first entry
  return String(entries[0][1]).substring(0, 50);
}

function ResponseDetailModal({ response, onClose, onUpdateStatus, onDelete }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  const StatusIcon = STATUS_CONFIG[response.status]?.icon || Clock;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Response Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Meta */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${STATUS_CONFIG[response.status]?.color}`}
              >
                <StatusIcon className="w-4 h-4" />
                {STATUS_CONFIG[response.status]?.label}
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              
              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <button
                        key={status}
                        onClick={() => {
                          onUpdateStatus(response.response_id, status);
                          setShowStatusMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                          response.status === status ? 'bg-gray-50 font-medium' : ''
                        }`}
                      >
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              {new Date(response.submitted_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
          
          {/* Form Data */}
          <div className="space-y-4">
            {Object.entries(response.form_data || {}).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-500 mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-wrap">
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value) || '-'}
                </div>
              </div>
            ))}
          </div>
          
          {/* Metadata */}
          {(response.ip_address || response.referrer) && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Submission Info</h4>
              <div className="text-sm space-y-2 text-gray-600">
                {response.ip_address && (
                  <div>IP: {response.ip_address}</div>
                )}
                {response.referrer && (
                  <div className="truncate">Referrer: {response.referrer}</div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between">
          <button
            onClick={() => {
              onDelete(response.response_id);
              onClose();
            }}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
