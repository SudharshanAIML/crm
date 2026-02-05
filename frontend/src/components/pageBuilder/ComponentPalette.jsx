/**
 * Component Palette
 * Displays available components that can be added to the page
 */
import { 
  Type, 
  Image, 
  FileText, 
  Video, 
  Minus, 
  Star, 
  Grid3X3,
  MessageSquare,
  Zap,
  Layout,
  Box
} from 'lucide-react';

// Component definitions with icons and descriptions
const COMPONENT_TYPES = [
  {
    type: 'hero',
    label: 'Hero Section',
    icon: Layout,
    description: 'Large banner with headline',
    category: 'layout'
  },
  {
    type: 'text',
    label: 'Text Block',
    icon: Type,
    description: 'Rich text content area',
    category: 'content'
  },
  {
    type: 'image',
    label: 'Image',
    icon: Image,
    description: 'Single image with caption',
    category: 'media'
  },
  {
    type: 'video',
    label: 'Video',
    icon: Video,
    description: 'YouTube, Vimeo, or direct',
    category: 'media'
  },
  {
    type: 'form',
    label: 'Contact Form',
    icon: FileText,
    description: 'Collect visitor information',
    category: 'interactive'
  },
  {
    type: 'cta',
    label: 'Call to Action',
    icon: Zap,
    description: 'Prominent action section',
    category: 'interactive'
  },
  {
    type: 'features',
    label: 'Features Grid',
    icon: Grid3X3,
    description: 'Show features in columns',
    category: 'content'
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: MessageSquare,
    description: 'Customer quote with rating',
    category: 'content'
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: Minus,
    description: 'Horizontal line separator',
    category: 'layout'
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: Box,
    description: 'Empty vertical space',
    category: 'layout'
  }
];

// Group components by category
const CATEGORIES = [
  { id: 'layout', label: 'Layout' },
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media' },
  { id: 'interactive', label: 'Interactive' }
];

export default function ComponentPalette({ onAdd }) {
  return (
    <div className="p-2" data-component-palette>
      {CATEGORIES.map((category) => {
        const categoryComponents = COMPONENT_TYPES.filter(
          (c) => c.category === category.id
        );
        
        if (categoryComponents.length === 0) return null;
        
        return (
          <div key={category.id} className="mb-4">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 mb-2">
              {category.label}
            </h4>
            <div className="space-y-1">
              {categoryComponents.map((component) => (
                <ComponentButton
                  key={component.type}
                  component={component}
                  onAdd={() => onAdd(component.type)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComponentButton({ component, onAdd }) {
  const Icon = component.icon;
  
  return (
    <button
      onClick={onAdd}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('componentType', component.type);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sky-50 text-left group transition-colors"
    >
      <div className="w-9 h-9 bg-gray-100 group-hover:bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
        <Icon className="w-4 h-4 text-gray-600 group-hover:text-sky-600" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-700 group-hover:text-sky-700">
          {component.label}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {component.description}
        </div>
      </div>
    </button>
  );
}
