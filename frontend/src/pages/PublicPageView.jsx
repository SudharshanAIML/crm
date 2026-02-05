/**
 * Public Page Renderer
 * Renders published pages for public viewing (no auth required)
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PagePreview from '../components/pageBuilder/PagePreview';
import * as pagesService from '../services/pagesService';

export default function PublicPageView() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load the public page
  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        const data = await pagesService.getPublicPage(slug);
        
        if (!data || data.status !== 'published') {
          setError('Page not found');
          return;
        }
        
        setPage(data);
        setComponents(data.components || []);
        
        // Update page title
        if (data.metaTitle || data.title) {
          document.title = data.metaTitle || data.title;
        }
        
        // Update meta description
        if (data.metaDescription) {
          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
          }
          metaDesc.content = data.metaDescription;
        }
        
        // Update OG image
        if (data.ogImageUrl) {
          let ogImage = document.querySelector('meta[property="og:image"]');
          if (!ogImage) {
            ogImage = document.createElement('meta');
            ogImage.setAttribute('property', 'og:image');
            document.head.appendChild(ogImage);
          }
          ogImage.content = data.ogImageUrl;
        }
        
      } catch (err) {
        console.error('Failed to load page:', err);
        setError('Page not found');
      } finally {
        setLoading(false);
      }
    };
    
    loadPage();
  }, [slug]);
  
  // Handle form submission
  const handleFormSubmit = useCallback(async (componentId, formData) => {
    try {
      await pagesService.submitPageForm(slug, {
        componentId,
        formData
      });
    } catch (err) {
      console.error('Form submission failed:', err);
      throw err;
    }
  }, [slug]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-8">Page not found</p>
          <a
            href="/"
            className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <PagePreview
      page={page}
      components={components}
      isPublic={true}
      onFormSubmit={handleFormSubmit}
    />
  );
}
