/**
 * Page Preview / Renderer
 * Renders the page components for preview and public viewing
 */
import { useState, useCallback, memo } from 'react';
import { Star, Play, Check } from 'lucide-react';

// Memoized component renderers for performance
const ComponentRenderer = memo(function ComponentRenderer({ component, isPublic, onFormSubmit }) {
  const { type, config, is_visible } = component;
  
  if (is_visible === false) return null;
  
  switch (type) {
    case 'hero':
      return <HeroComponent config={config} />;
    case 'text':
      return <TextComponent config={config} />;
    case 'image':
      return <ImageComponent config={config} />;
    case 'video':
      return <VideoComponent config={config} />;
    case 'form':
      return <FormComponent config={config} isPublic={isPublic} onSubmit={onFormSubmit} componentId={component.component_id} />;
    case 'cta':
      return <CTAComponent config={config} />;
    case 'features':
      return <FeaturesComponent config={config} />;
    case 'testimonial':
      return <TestimonialComponent config={config} />;
    case 'divider':
      return <DividerComponent config={config} />;
    case 'spacer':
      return <SpacerComponent config={config} />;
    default:
      return null;
  }
});

export default function PagePreview({ page, components, isPublic = false, onFormSubmit }) {
  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta (only matters for SSR, but structure is here) */}
      {page?.metaTitle && (
        <title>{page.metaTitle}</title>
      )}
      
      {/* Render all components */}
      {components.map((component, index) => (
        <ComponentRenderer
          key={component.component_id || index}
          component={component}
          isPublic={isPublic}
          onFormSubmit={onFormSubmit}
        />
      ))}
      
      {/* Footer for public pages */}
      {isPublic && (
        <footer className="py-8 text-center text-sm text-gray-400 border-t border-gray-100">
          <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}

/* ========================================
   COMPONENT RENDERERS
======================================== */

function HeroComponent({ config }) {
  const bgStyle = {};
  
  if (config.backgroundType === 'image' && config.backgroundValue) {
    bgStyle.backgroundImage = `url(${config.backgroundValue})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  }
  
  const gradientClass = config.backgroundType === 'gradient' 
    ? `bg-gradient-to-br ${config.backgroundValue || 'from-sky-500 to-blue-600'}` 
    : '';
  
  const textColorClass = config.textColor === 'white' ? 'text-white' : 'text-gray-900';
  const alignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end'
  }[config.alignment || 'center'];
  
  return (
    <section 
      className={`py-20 px-6 ${gradientClass}`}
      style={bgStyle}
    >
      <div className={`max-w-4xl mx-auto flex flex-col ${alignClass}`}>
        <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold ${textColorClass} mb-4`}>
          {config.title}
        </h1>
        {config.subtitle && (
          <p className={`text-lg md:text-xl ${textColorClass} opacity-90 mb-8 max-w-2xl`}>
            {config.subtitle}
          </p>
        )}
        {config.showCta && config.ctaText && (
          <a
            href={config.ctaUrl || '#'}
            className="inline-flex px-8 py-3 bg-white text-sky-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            {config.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

function TextComponent({ config }) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center mx-auto',
    right: 'text-right ml-auto'
  }[config.alignment || 'left'];
  
  return (
    <section className="py-12 px-6">
      <div 
        className={`prose prose-lg ${alignClass}`}
        style={{ maxWidth: config.maxWidth || '800px' }}
        dangerouslySetInnerHTML={{ __html: config.content }}
      />
    </section>
  );
}

function ImageComponent({ config }) {
  if (!config.src) {
    return (
      <section className="py-8 px-6">
        <div className="max-w-4xl mx-auto bg-gray-100 rounded-lg h-64 flex items-center justify-center text-gray-400">
          No image selected
        </div>
      </section>
    );
  }
  
  const alignClass = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto'
  }[config.alignment || 'center'];
  
  return (
    <section className="py-8 px-6">
      <figure className={alignClass} style={{ maxWidth: config.maxWidth || '100%' }}>
        <img
          src={config.src}
          alt={config.alt || ''}
          className={`w-full ${config.rounded ? 'rounded-xl' : ''}`}
          loading="lazy"
        />
        {config.caption && (
          <figcaption className="text-sm text-gray-500 text-center mt-3">
            {config.caption}
          </figcaption>
        )}
      </figure>
    </section>
  );
}

function VideoComponent({ config }) {
  const [isPlaying, setIsPlaying] = useState(config.autoplay);
  
  // Extract video ID from YouTube URL
  const getYouTubeId = (url) => {
    const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
    return match ? match[1] : null;
  };
  
  // Extract Vimeo ID
  const getVimeoId = (url) => {
    const match = url?.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  };
  
  if (!config.url) {
    return (
      <section className="py-8 px-6">
        <div className="max-w-4xl mx-auto bg-gray-100 rounded-lg h-64 flex items-center justify-center text-gray-400">
          No video URL provided
        </div>
      </section>
    );
  }
  
  let embedUrl = '';
  
  if (config.provider === 'youtube') {
    const id = getYouTubeId(config.url);
    if (id) {
      const params = new URLSearchParams({
        autoplay: isPlaying ? '1' : '0',
        mute: config.muted ? '1' : '0'
      });
      embedUrl = `https://www.youtube.com/embed/${id}?${params}`;
    }
  } else if (config.provider === 'vimeo') {
    const id = getVimeoId(config.url);
    if (id) {
      embedUrl = `https://player.vimeo.com/video/${id}?autoplay=${isPlaying ? 1 : 0}&muted=${config.muted ? 1 : 0}`;
    }
  }
  
  return (
    <section className="py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {config.title && (
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">{config.title}</h3>
        )}
        <div className="aspect-video rounded-xl overflow-hidden bg-gray-900">
          {config.provider === 'direct' ? (
            <video
              src={config.url}
              controls
              autoPlay={config.autoplay}
              muted={config.muted}
              className="w-full h-full"
            />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Invalid video URL
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FormComponent({ config, isPublic, onSubmit, componentId }) {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isPublic) {
      // Preview mode - just show success
      setIsSubmitted(true);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (onSubmit) {
        await onSubmit(componentId, formData);
      }
      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };
  
  if (isSubmitted) {
    return (
      <section className="py-12 px-6">
        <div className="max-w-lg mx-auto bg-green-50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg text-green-800">{config.successMessage || 'Thank you for your submission!'}</p>
        </div>
      </section>
    );
  }
  
  return (
    <section className="py-12 px-6" id="form">
      <div className="max-w-lg mx-auto bg-gray-50 rounded-2xl p-8">
        {config.title && (
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">{config.title}</h2>
        )}
        {config.description && (
          <p className="text-gray-600 mb-6 text-center">{config.description}</p>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {(config.fields || []).map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              ) : field.type === 'select' ? (
                <select
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData[field.id] || false}
                    onChange={(e) => handleChange(field.id, e.target.checked)}
                    required={field.required}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">{field.placeholder}</span>
                </label>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              )}
            </div>
          ))}
          
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : (config.submitText || 'Submit')}
          </button>
        </form>
      </div>
    </section>
  );
}

function CTAComponent({ config }) {
  return (
    <section className={`py-16 px-6 ${config.backgroundColor || 'bg-sky-50'}`}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">{config.title}</h2>
        {config.description && (
          <p className="text-lg text-gray-600 mb-8">{config.description}</p>
        )}
        <a
          href={config.buttonUrl || '#'}
          className={`inline-flex px-8 py-3 ${config.buttonColor || 'bg-sky-600'} text-white font-semibold rounded-lg hover:opacity-90 transition-opacity`}
        >
          {config.buttonText || 'Get Started'}
        </a>
      </div>
    </section>
  );
}

function FeaturesComponent({ config }) {
  const columns = config.columns || 3;
  const gridClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4'
  }[columns];
  
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {config.title && (
          <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">{config.title}</h2>
        )}
        
        <div className={`grid grid-cols-1 ${gridClass} gap-8`}>
          {(config.items || []).map((item, index) => (
            <div key={index} className="text-center p-6">
              <div className="w-14 h-14 bg-sky-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Star className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialComponent({ config }) {
  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto text-center">
        {/* Stars */}
        <div className="flex justify-center gap-1 mb-6">
          {[...Array(config.rating || 5)].map((_, i) => (
            <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
          ))}
        </div>
        
        {/* Quote */}
        <blockquote className="text-2xl text-gray-700 mb-8 leading-relaxed">
          "{config.quote}"
        </blockquote>
        
        {/* Author */}
        <div className="flex items-center justify-center gap-4">
          {config.avatar && (
            <img
              src={config.avatar}
              alt={config.author}
              className="w-14 h-14 rounded-full object-cover"
            />
          )}
          <div className="text-left">
            <div className="font-semibold text-gray-800">{config.author}</div>
            {config.role && (
              <div className="text-sm text-gray-500">{config.role}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DividerComponent({ config }) {
  return (
    <div 
      className="flex justify-center"
      style={{ margin: config.margin || '2rem 0' }}
    >
      <hr 
        style={{
          width: config.width || '100%',
          borderTopStyle: config.style || 'solid',
          borderTopWidth: `${config.thickness || 1}px`,
          borderTopColor: config.color || '#e5e7eb'
        }}
      />
    </div>
  );
}

function SpacerComponent({ config }) {
  return <div style={{ height: config.height || '4rem' }} />;
}
