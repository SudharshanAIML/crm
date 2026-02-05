/**
 * Outreach Pages List Page
 * Lists all landing pages with management options
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Eye, 
  Edit2, 
  Trash2, 
  Copy, 
  ExternalLink,
  FileText,
  BarChart3,
  Filter,
  Archive,
  Send
} from 'lucide-react';
import * as pagesService from '../services/pagesService';

// Status badge colors
const STATUS_STYLES = {
  draft: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-600'
};

// Page templates for quick start
const TEMPLATES = [
  { id: 'blank', label: 'Blank Page', icon: FileText, description: 'Start from scratch' },
  { id: 'landing', label: 'Landing Page', icon: BarChart3, description: 'Hero, features, CTA, form' },
  { id: 'contact', label: 'Contact Page', icon: FileText, description: 'Simple contact form' }
];

export default function PagesListPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // UI state
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  
  const basePath = isAdmin ? '/admin' : '';
  
  // Load pages
  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await pagesService.getPages({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined
      });
      setPages(data.pages || []);
    } catch (err) {
      setError('Failed to load pages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);
  
  useEffect(() => {
    loadPages();
  }, [loadPages]);
  
  // Filter pages client-side for instant feedback
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesSearch = !searchQuery || 
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pages, searchQuery, statusFilter]);
  
  // Actions
  const handleCreatePage = (templateId) => {
    setShowNewPageModal(false);
    navigate(`${basePath}/pages/new?template=${templateId}`);
  };
  
  const handleEditPage = (pageId) => {
    navigate(`${basePath}/pages/${pageId}/edit`);
  };
  
  const handleViewResponses = (pageId) => {
    navigate(`${basePath}/pages/${pageId}/responses`);
  };
  
  const handleDuplicatePage = async (pageId) => {
    try {
      await pagesService.duplicatePage(pageId);
      loadPages();
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
    setMenuOpenId(null);
  };
  
  const handleArchivePage = async (pageId) => {
    try {
      await pagesService.archivePage(pageId);
      loadPages();
    } catch (err) {
      console.error('Failed to archive:', err);
    }
    setMenuOpenId(null);
  };
  
  const handleDeletePage = async (pageId) => {
    if (!confirm('Are you sure you want to delete this page? This cannot be undone.')) {
      return;
    }
    
    setDeletingId(pageId);
    try {
      await pagesService.deletePage(pageId);
      setPages(prev => prev.filter(p => p.page_id !== pageId));
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeletingId(null);
    }
    setMenuOpenId(null);
  };
  
  const copyPageLink = async (slug) => {
    const url = `${window.location.origin}/p/${slug}`;
    await navigator.clipboard.writeText(url);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Landing Pages</h1>
            <p className="text-gray-500 mt-1">Create and manage landing pages for your outreach campaigns</p>
          </div>
          
          <button
            onClick={() => setShowNewPageModal(true)}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Page
          </button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search pages..."
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
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        
        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded flex-1" />
                  <div className="h-8 bg-gray-200 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPages.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No pages found' : 'No pages yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Create your first landing page to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setShowNewPageModal(true)}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
              >
                Create Page
              </button>
            )}
          </div>
        ) : (
          /* Pages grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPages.map((page) => (
              <PageCard
                key={page.page_id}
                page={page}
                basePath={basePath}
                menuOpen={menuOpenId === page.page_id}
                deleting={deletingId === page.page_id}
                onToggleMenu={() => setMenuOpenId(menuOpenId === page.page_id ? null : page.page_id)}
                onEdit={() => handleEditPage(page.page_id)}
                onViewResponses={() => handleViewResponses(page.page_id)}
                onDuplicate={() => handleDuplicatePage(page.page_id)}
                onArchive={() => handleArchivePage(page.page_id)}
                onDelete={() => handleDeletePage(page.page_id)}
                onCopyLink={() => copyPageLink(page.slug)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* New Page Modal */}
      {showNewPageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Create New Page</h2>
              <p className="text-sm text-gray-500 mt-1">Choose a template to get started</p>
            </div>
            
            <div className="p-6 space-y-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleCreatePage(template.id)}
                  className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-sky-300 hover:bg-sky-50 transition-colors text-left"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <template.icon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{template.label}</div>
                    <div className="text-sm text-gray-500">{template.description}</div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowNewPageModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageCard({ 
  page, 
  basePath,
  menuOpen, 
  deleting,
  onToggleMenu, 
  onEdit, 
  onViewResponses,
  onDuplicate, 
  onArchive, 
  onDelete,
  onCopyLink 
}) {
  const formattedDate = new Date(page.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative ${deleting ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[page.status]}`}>
          {page.status}
        </span>
        
        <div className="relative">
          <button
            onClick={onToggleMenu}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onToggleMenu} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                <button
                  onClick={onEdit}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                
                {page.status === 'published' && (
                  <>
                    <a
                      href={`/p/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Live
                    </a>
                    <button
                      onClick={onCopyLink}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                  </>
                )}
                
                <button
                  onClick={onViewResponses}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Responses
                </button>
                
                <button
                  onClick={onDuplicate}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                
                {page.status !== 'archived' && (
                  <button
                    onClick={onArchive}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                )}
                
                <hr className="my-1" />
                
                <button
                  onClick={onDelete}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Title and slug */}
      <h3 className="font-semibold text-gray-800 mb-1 truncate">{page.title}</h3>
      <p className="text-sm text-gray-500 mb-4">/{page.slug}</p>
      
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          <span>{page.view_count || 0} views</span>
        </div>
        <span>•</span>
        <span>{formattedDate}</span>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-1"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        
        {page.status === 'published' ? (
          <a
            href={`/p/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-3 bg-sky-100 hover:bg-sky-200 rounded-lg text-sm font-medium text-sky-700 flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <button
            onClick={onEdit}
            className="py-2 px-3 bg-amber-100 hover:bg-amber-200 rounded-lg text-sm font-medium text-amber-700 flex items-center gap-1"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
