/**
 * Page Builder Page
 * Main interface for creating and editing outreach landing pages
 */
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Save, 
  Eye, 
  ArrowLeft, 
  Trash2, 
  GripVertical,
  Settings,
  Send,
  ExternalLink,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import * as pagesService from '../services/pagesService';

// Lazy load the component palette and property editor for performance
const ComponentPalette = lazy(() => import('../components/pageBuilder/ComponentPalette'));
const PropertyEditor = lazy(() => import('../components/pageBuilder/PropertyEditor'));
const PagePreview = lazy(() => import('../components/pageBuilder/PagePreview'));

// Loading skeleton for component panels
const PanelSkeleton = () => (
  <div className="animate-pulse space-y-3 p-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-12 bg-gray-200 rounded-lg" />
    ))}
  </div>
);

// Default component configurations
const DEFAULT_COMPONENTS = {
  hero: {
    type: 'hero',
    config: {
      title: 'Welcome to Our Page',
      subtitle: 'Add a compelling subtitle here',
      backgroundType: 'gradient',
      backgroundValue: { colors: ['#0ea5e9', '#2563eb'], direction: 'to-br' },
      textColor: 'white',
      alignment: 'center',
      showCta: true,
      ctaText: 'Get Started',
      ctaUrl: '#contact'
    }
  },
  text: {
    type: 'text',
    config: {
      content: '<p>Add your content here. You can format text, add links, and more.</p>',
      alignment: 'left',
      maxWidth: '800px'
    }
  },
  image: {
    type: 'image',
    config: {
      src: '',
      alt: 'Image description',
      caption: '',
      maxWidth: '100%',
      alignment: 'center',
      rounded: true
    }
  },
  form: {
    type: 'form',
    config: {
      title: 'Contact Us',
      description: "We'd love to hear from you",
      submitText: 'Submit',
      successMessage: 'Thank you for your submission!',
      fields: [
        { id: 'name', type: 'text', label: 'Full Name', required: true, placeholder: 'John Doe' },
        { id: 'email', type: 'email', label: 'Email', required: true, placeholder: 'john@example.com' },
        { id: 'message', type: 'textarea', label: 'Message', required: false, placeholder: 'Your message...' }
      ]
    }
  },
  cta: {
    type: 'cta',
    config: {
      title: 'Ready to Get Started?',
      description: 'Join thousands of satisfied customers.',
      buttonText: 'Contact Us',
      buttonUrl: '#form',
      backgroundColor: '#f0f9ff',
      buttonColor: '#0284c7'
    }
  },
  video: {
    type: 'video',
    config: {
      url: '',
      provider: 'youtube', // youtube, vimeo, direct
      autoplay: false,
      muted: true,
      title: 'Video Title'
    }
  },
  divider: {
    type: 'divider',
    config: {
      style: 'solid', // solid, dashed, dotted, gradient
      color: '#e5e7eb',
      thickness: 1,
      width: '100%',
      margin: '2rem'
    }
  },
  spacer: {
    type: 'spacer',
    config: {
      height: '4rem'
    }
  },
  testimonial: {
    type: 'testimonial',
    config: {
      quote: 'This product changed the way we do business.',
      author: 'Jane Smith',
      role: 'CEO, Example Inc.',
      avatar: '',
      rating: 5
    }
  },
  features: {
    type: 'features',
    config: {
      title: 'Our Features',
      columns: 3,
      items: [
        { icon: 'star', title: 'Feature 1', description: 'Description of feature 1' },
        { icon: 'zap', title: 'Feature 2', description: 'Description of feature 2' },
        { icon: 'shield', title: 'Feature 3', description: 'Description of feature 3' }
      ]
    }
  }
};

export default function PageBuilderPage() {
  const { pageId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  // Page state
  const [page, setPage] = useState(null);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // UI state
  const [selectedComponentIndex, setSelectedComponentIndex] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Check if creating new page - either pageId is 'new' or path ends with /new
  const isNewPage = pageId === 'new' || location.pathname.endsWith('/new');
  const basePath = isAdmin ? '/admin' : '';
  
  // Load page data
  useEffect(() => {
    const loadPage = async () => {
      if (isNewPage) {
        // Initialize new page
        const templateType = searchParams.get('template');
        setPage({
          title: 'Untitled Page',
          description: '',
          status: 'draft',
          metaTitle: '',
          metaDescription: ''
        });
        
        // Add default components based on template
        if (templateType === 'landing') {
          setComponents([
            { ...DEFAULT_COMPONENTS.hero, sort_order: 0 },
            { ...DEFAULT_COMPONENTS.features, sort_order: 1 },
            { ...DEFAULT_COMPONENTS.cta, sort_order: 2 },
            { ...DEFAULT_COMPONENTS.form, sort_order: 3 }
          ]);
        } else if (templateType === 'contact') {
          setComponents([
            { ...DEFAULT_COMPONENTS.hero, sort_order: 0, config: { ...DEFAULT_COMPONENTS.hero.config, title: 'Get in Touch' } },
            { ...DEFAULT_COMPONENTS.text, sort_order: 1 },
            { ...DEFAULT_COMPONENTS.form, sort_order: 2 }
          ]);
        } else {
          setComponents([]);
        }
        
        setLoading(false);
        return;
      }
      
      try {
        const data = await pagesService.getPage(pageId);
        setPage(data);
        setComponents(data.components || []);
      } catch (err) {
        setError('Failed to load page');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadPage();
  }, [pageId, isNewPage, searchParams]);
  
  // Auto-save with debounce
  const savePageDebounced = useCallback(async () => {
    if (!hasChanges || isNewPage) return;
    
    try {
      setSaving(true);
      const updated = await pagesService.updatePage(pageId, {
        ...page,
        components
      });
      // Update local state with server response (includes component IDs)
      setPage(updated);
      setComponents(updated.components || []);
      setHasChanges(false);
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [hasChanges, isNewPage, page, components, pageId]);
  
  // Mark as changed when edits occur
  const handleChange = useCallback(() => {
    setHasChanges(true);
  }, []);
  
  // Add component
  const addComponent = useCallback((type) => {
    const newComponent = {
      ...DEFAULT_COMPONENTS[type],
      sort_order: components.length,
      is_visible: true
    };
    setComponents(prev => [...prev, newComponent]);
    setSelectedComponentIndex(components.length);
    handleChange();
  }, [components.length, handleChange]);
  
  // Update component config
  const updateComponent = useCallback((index, updates) => {
    setComponents(prev => prev.map((comp, i) => 
      i === index ? { ...comp, ...updates } : comp
    ));
    handleChange();
  }, [handleChange]);
  
  // Delete component
  const deleteComponent = useCallback((index) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
    setSelectedComponentIndex(null);
    handleChange();
  }, [handleChange]);
  
  // Reorder components (drag and drop)
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };
  
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newComponents = [...components];
    const [dragged] = newComponents.splice(draggedIndex, 1);
    newComponents.splice(index, 0, dragged);
    
    // Update sort_order
    newComponents.forEach((comp, i) => {
      comp.sort_order = i;
    });
    
    setComponents(newComponents);
    setDraggedIndex(index);
    handleChange();
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  // Save page
  const savePage = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (isNewPage) {
        const created = await pagesService.createPage({
          ...page,
          components
        });
        // Update local state with server response (includes component IDs)
        setPage(created);
        setComponents(created.components || []);
        navigate(`${basePath}/pages/${created.page_id}/edit`, { replace: true });
      } else {
        const updated = await pagesService.updatePage(pageId, {
          ...page,
          components
        });
        // Update local state with server response (includes new component IDs)
        setPage(updated);
        setComponents(updated.components || []);
      }
      
      setHasChanges(false);
    } catch (err) {
      setError('Failed to save page');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  
  // Publish page
  const publishPage = async () => {
    try {
      setSaving(true);
      if (isNewPage) {
        // Save first then publish
        const created = await pagesService.createPage({ ...page, components });
        await pagesService.publishPage(created.page_id);
        navigate(`${basePath}/pages/${created.page_id}/edit`, { replace: true });
      } else {
        await savePage();
        await pagesService.publishPage(pageId);
      }
      setPage(prev => ({ ...prev, status: 'published' }));
    } catch (err) {
      setError('Failed to publish page');
    } finally {
      setSaving(false);
    }
  };
  
  // Copy page link
  const copyPageLink = async () => {
    if (!page?.slug) return;
    
    const url = `${window.location.origin}/p/${page.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>
    );
  }
  
  // Preview mode
  if (showPreview) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>}>
        <div className="relative">
          <div className="fixed top-4 right-4 z-50 flex gap-2">
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Editor
            </button>
          </div>
          <PagePreview page={page} components={components} />
        </div>
      </Suspense>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`${basePath}/pages`)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={page?.title || ''}
            onChange={(e) => {
              setPage(prev => ({ ...prev, title: e.target.value }));
              handleChange();
            }}
            className="text-lg font-medium bg-transparent border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded px-2 py-1"
            placeholder="Page Title"
          />
          
          {page?.status && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              page.status === 'published' 
                ? 'bg-green-100 text-green-700' 
                : page.status === 'archived'
                ? 'bg-gray-100 text-gray-600'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {page.status}
            </span>
          )}
          
          {hasChanges && (
            <span className="text-xs text-gray-400">Unsaved changes</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {page?.slug && page.status === 'published' && (
            <button
              onClick={copyPageLink}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
            >
              {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
          )}
          
          <button
            onClick={() => setShowPreview(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          
          <button
            onClick={savePage}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-gray-800 text-white hover:bg-gray-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          
          {page?.status !== 'published' && (
            <button
              onClick={publishPage}
              disabled={saving}
              className="px-4 py-1.5 text-sm bg-sky-600 text-white hover:bg-sky-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Publish
            </button>
          )}
          
          {page?.status === 'published' && page.slug && (
            <a
              href={`/p/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Live
            </a>
          )}
        </div>
      </header>
      
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      {/* Main Editor */}
      <div className="flex-1 flex">
        {/* Component Palette (Left) */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Components</h3>
            <p className="text-xs text-gray-500 mt-1">Drag or click to add</p>
          </div>
          <Suspense fallback={<PanelSkeleton />}>
            <ComponentPalette onAdd={addComponent} />
          </Suspense>
        </aside>
        
        {/* Canvas (Center) */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            {components.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Start Building Your Page</h3>
                <p className="text-gray-500 mb-4">Add components from the left panel to get started</p>
                <button
                  onClick={() => addComponent('hero')}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                >
                  Add Hero Section
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {components.map((component, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedComponentIndex(index)}
                    className={`relative bg-white rounded-xl shadow-sm border-2 transition-all cursor-pointer group ${
                      selectedComponentIndex === index 
                        ? 'border-sky-500 ring-2 ring-sky-100' 
                        : 'border-transparent hover:border-gray-200'
                    } ${draggedIndex === index ? 'opacity-50' : ''}`}
                  >
                    {/* Drag Handle */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>
                    
                    {/* Component Preview */}
                    <div className="p-4 pl-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {component.type}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteComponent(index);
                          }}
                          className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Mini preview of component */}
                      <div className="text-sm text-gray-500 truncate">
                        {component.type === 'hero' && component.config?.title}
                        {component.type === 'text' && 'Text Block'}
                        {component.type === 'image' && (component.config?.alt || 'Image')}
                        {component.type === 'form' && component.config?.title}
                        {component.type === 'cta' && component.config?.title}
                        {component.type === 'video' && 'Video Embed'}
                        {component.type === 'divider' && 'Divider'}
                        {component.type === 'spacer' && `Spacer (${component.config?.height})`}
                        {component.type === 'testimonial' && component.config?.author}
                        {component.type === 'features' && `${component.config?.items?.length || 0} Features`}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add Component Button */}
                <button
                  onClick={() => document.querySelector('[data-component-palette]')?.scrollIntoView()}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Component
                </button>
              </div>
            )}
          </div>
        </main>
        
        {/* Property Editor (Right) */}
        <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          {selectedComponentIndex !== null && components[selectedComponentIndex] ? (
            <Suspense fallback={<PanelSkeleton />}>
              <PropertyEditor
                component={components[selectedComponentIndex]}
                onChange={(updates) => updateComponent(selectedComponentIndex, updates)}
                onClose={() => setSelectedComponentIndex(null)}
              />
            </Suspense>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <Settings className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Select a component to edit its properties</p>
            </div>
          )}
        </aside>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Page Settings</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={page?.description || ''}
                  onChange={(e) => {
                    setPage(prev => ({ ...prev, description: e.target.value }));
                    handleChange();
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Brief description of your page"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title (SEO)</label>
                <input
                  type="text"
                  value={page?.metaTitle || ''}
                  onChange={(e) => {
                    setPage(prev => ({ ...prev, metaTitle: e.target.value }));
                    handleChange();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Page title for search engines"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description (SEO)</label>
                <textarea
                  value={page?.metaDescription || ''}
                  onChange={(e) => {
                    setPage(prev => ({ ...prev, metaDescription: e.target.value }));
                    handleChange();
                  }}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Description for search engines"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Social Share Image URL</label>
                <input
                  type="url"
                  value={page?.ogImageUrl || ''}
                  onChange={(e) => {
                    setPage(prev => ({ ...prev, ogImageUrl: e.target.value }));
                    handleChange();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
