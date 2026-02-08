/**
 * Property Editor
 * Right panel for editing selected component properties
 */
import { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical
} from 'lucide-react';
import ColorPicker from './ColorPicker';
import GradientPicker from './GradientPicker';

// Form field types for the form builder
const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' }
];

export default function PropertyEditor({ component, onChange, onClose }) {
  const { type, config, is_visible } = component;
  
  const updateConfig = (key, value) => {
    onChange({
      config: { ...config, [key]: value }
    });
  };
  
  const toggleVisibility = () => {
    onChange({ is_visible: !is_visible });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-800 capitalize">{type}</h3>
          <p className="text-xs text-gray-500">Edit properties</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleVisibility}
            className={`p-1.5 rounded-lg ${is_visible !== false ? 'text-gray-400 hover:text-gray-600' : 'text-amber-500 bg-amber-50'}`}
            title={is_visible !== false ? 'Hide component' : 'Show component'}
          >
            {is_visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {type === 'hero' && (
          <HeroEditor config={config} updateConfig={updateConfig} />
        )}
        
        {type === 'text' && (
          <TextEditor config={config} updateConfig={updateConfig} />
        )}
        
        {type === 'image' && (
          <ImageEditor config={config} updateConfig={updateConfig} />
        )}
        
        {type === 'video' && (
          <VideoEditor config={config} updateConfig={updateConfig} />
        )}
        
        {type === 'form' && (
          <FormEditor config={config} updateConfig={updateConfig} />
        )}
        
        {type === 'cta' && (
          <CTAEditor config={config} updateConfig={updateConfig} />
        )}
        
        {type === 'features' && (
          <FeaturesEditor config={config} updateConfig={updateConfig} />
        )}
        
        {type === 'testimonial' && (
          <TestimonialEditor config={config} updateConfig={updateConfig} />
        )}
        
        {type === 'divider' && (
          <DividerEditor config={config} updateConfig={updateConfig} />
        )}
        
        {type === 'spacer' && (
          <SpacerEditor config={config} updateConfig={updateConfig} />
        )}
      </div>
    </div>
  );
}

// Input wrapper component
function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// Text input
function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
    />
  );
}

// Textarea
function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
    />
  );
}

// Select
function Select({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Toggle
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-sky-500' : 'bg-gray-300'}`}>
        <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${checked ? 'right-0.5' : 'left-0.5'}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="checkbox"
        checked={checked || false}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
}

// Collapsible Section
function Section({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {isOpen && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

/* ========================================
   COMPONENT-SPECIFIC EDITORS
======================================== */

function HeroEditor({ config, updateConfig }) {
  return (
    <>
      <Field label="Title">
        <TextInput
          value={config.title}
          onChange={(v) => updateConfig('title', v)}
          placeholder="Your headline"
        />
      </Field>
      
      <Field label="Subtitle">
        <TextArea
          value={config.subtitle}
          onChange={(v) => updateConfig('subtitle', v)}
          placeholder="Supporting text"
          rows={2}
        />
      </Field>
      
      <Field label="Alignment">
        <Select
          value={config.alignment}
          onChange={(v) => updateConfig('alignment', v)}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' }
          ]}
        />
      </Field>
      
      <Section title="Background">
        <Field label="Type">
          <Select
            value={config.backgroundType}
            onChange={(v) => updateConfig('backgroundType', v)}
            options={[
              { value: 'gradient', label: 'Gradient' },
              { value: 'color', label: 'Solid Color' },
              { value: 'image', label: 'Image' }
            ]}
          />
        </Field>
        
        {config.backgroundType === 'gradient' && (
          <GradientPicker
            value={config.backgroundValue}
            onChange={(v) => updateConfig('backgroundValue', v)}
            label="Gradient"
          />
        )}
        
        {config.backgroundType === 'color' && (
          <ColorPicker
            value={config.backgroundValue}
            onChange={(v) => updateConfig('backgroundValue', v)}
            label="Background Color"
          />
        )}
        
        {config.backgroundType === 'image' && (
          <Field label="Image URL">
            <TextInput
              value={config.backgroundValue}
              onChange={(v) => updateConfig('backgroundValue', v)}
              placeholder="https://..."
              type="url"
            />
          </Field>
        )}
      </Section>
      
      <Section title="Call to Action">
        <Toggle
          checked={config.showCta}
          onChange={(v) => updateConfig('showCta', v)}
          label="Show CTA Button"
        />
        
        {config.showCta && (
          <>
            <Field label="Button Text">
              <TextInput
                value={config.ctaText}
                onChange={(v) => updateConfig('ctaText', v)}
                placeholder="Get Started"
              />
            </Field>
            <Field label="Button Link">
              <TextInput
                value={config.ctaUrl}
                onChange={(v) => updateConfig('ctaUrl', v)}
                placeholder="#form or https://..."
              />
            </Field>
          </>
        )}
      </Section>
    </>
  );
}

function TextEditor({ config, updateConfig }) {
  return (
    <>
      <Field label="Content" hint="HTML is supported">
        <TextArea
          value={config.content}
          onChange={(v) => updateConfig('content', v)}
          placeholder="<p>Your content here...</p>"
          rows={8}
        />
      </Field>
      
      <Field label="Alignment">
        <Select
          value={config.alignment}
          onChange={(v) => updateConfig('alignment', v)}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' }
          ]}
        />
      </Field>
      
      <Field label="Max Width">
        <TextInput
          value={config.maxWidth}
          onChange={(v) => updateConfig('maxWidth', v)}
          placeholder="800px"
        />
      </Field>
    </>
  );
}

function ImageEditor({ config, updateConfig }) {
  return (
    <>
      <Field label="Image URL">
        <TextInput
          value={config.src}
          onChange={(v) => updateConfig('src', v)}
          placeholder="https://..."
          type="url"
        />
      </Field>
      
      <Field label="Alt Text" hint="For accessibility">
        <TextInput
          value={config.alt}
          onChange={(v) => updateConfig('alt', v)}
          placeholder="Image description"
        />
      </Field>
      
      <Field label="Caption">
        <TextInput
          value={config.caption}
          onChange={(v) => updateConfig('caption', v)}
          placeholder="Optional caption"
        />
      </Field>
      
      <Field label="Max Width">
        <TextInput
          value={config.maxWidth}
          onChange={(v) => updateConfig('maxWidth', v)}
          placeholder="100%"
        />
      </Field>
      
      <Field label="Alignment">
        <Select
          value={config.alignment}
          onChange={(v) => updateConfig('alignment', v)}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' }
          ]}
        />
      </Field>
      
      <Toggle
        checked={config.rounded}
        onChange={(v) => updateConfig('rounded', v)}
        label="Rounded Corners"
      />
    </>
  );
}

function VideoEditor({ config, updateConfig }) {
  return (
    <>
      <Field label="Video URL">
        <TextInput
          value={config.url}
          onChange={(v) => updateConfig('url', v)}
          placeholder="https://youtube.com/watch?v=..."
          type="url"
        />
      </Field>
      
      <Field label="Provider">
        <Select
          value={config.provider}
          onChange={(v) => updateConfig('provider', v)}
          options={[
            { value: 'youtube', label: 'YouTube' },
            { value: 'vimeo', label: 'Vimeo' },
            { value: 'direct', label: 'Direct MP4' }
          ]}
        />
      </Field>
      
      <Field label="Title">
        <TextInput
          value={config.title}
          onChange={(v) => updateConfig('title', v)}
          placeholder="Video title"
        />
      </Field>
      
      <Toggle
        checked={config.autoplay}
        onChange={(v) => updateConfig('autoplay', v)}
        label="Autoplay"
      />
      
      <Toggle
        checked={config.muted}
        onChange={(v) => updateConfig('muted', v)}
        label="Muted"
      />
    </>
  );
}

function FormEditor({ config, updateConfig }) {
  const fields = config.fields || [];
  
  const addField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false,
      placeholder: ''
    };
    updateConfig('fields', [...fields, newField]);
  };
  
  const updateField = (index, updates) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    updateConfig('fields', newFields);
  };
  
  const deleteField = (index) => {
    updateConfig('fields', fields.filter((_, i) => i !== index));
  };
  
  const moveField = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    updateConfig('fields', newFields);
  };
  
  return (
    <>
      <Field label="Form Title">
        <TextInput
          value={config.title}
          onChange={(v) => updateConfig('title', v)}
          placeholder="Contact Us"
        />
      </Field>
      
      <Field label="Description">
        <TextArea
          value={config.description}
          onChange={(v) => updateConfig('description', v)}
          placeholder="Optional description"
          rows={2}
        />
      </Field>
      
      <Section title="Form Fields">
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  placeholder="Field label"
                />
                <button
                  onClick={() => deleteField(index)}
                  className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={field.type}
                  onChange={(e) => updateField(index, { type: e.target.value })}
                  className="px-2 py-1 text-sm border border-gray-200 rounded"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                
                <label className="flex items-center gap-1 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="rounded"
                  />
                  Required
                </label>
              </div>
              
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                placeholder="Placeholder text"
              />
            </div>
          ))}
        </div>
        
        <button
          onClick={addField}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </Section>
      
      <Field label="Submit Button Text">
        <TextInput
          value={config.submitText}
          onChange={(v) => updateConfig('submitText', v)}
          placeholder="Submit"
        />
      </Field>
      
      <Field label="Success Message">
        <TextArea
          value={config.successMessage}
          onChange={(v) => updateConfig('successMessage', v)}
          placeholder="Thank you for your submission!"
          rows={2}
        />
      </Field>
    </>
  );
}

function CTAEditor({ config, updateConfig }) {
  return (
    <>
      <Field label="Title">
        <TextInput
          value={config.title}
          onChange={(v) => updateConfig('title', v)}
          placeholder="Ready to Get Started?"
        />
      </Field>
      
      <Field label="Description">
        <TextArea
          value={config.description}
          onChange={(v) => updateConfig('description', v)}
          placeholder="Supporting text"
          rows={2}
        />
      </Field>
      
      <Field label="Button Text">
        <TextInput
          value={config.buttonText}
          onChange={(v) => updateConfig('buttonText', v)}
          placeholder="Contact Us"
        />
      </Field>
      
      <Field label="Button Link">
        <TextInput
          value={config.buttonUrl}
          onChange={(v) => updateConfig('buttonUrl', v)}
          placeholder="#form"
        />
      </Field>
      
      <ColorPicker
        value={config.backgroundColor}
        onChange={(v) => updateConfig('backgroundColor', v)}
        label="Background Color"
      />
      
      <ColorPicker
        value={config.buttonColor}
        onChange={(v) => updateConfig('buttonColor', v)}
        label="Button Color"
      />
    </>
  );
}

function FeaturesEditor({ config, updateConfig }) {
  const items = config.items || [];
  
  const addItem = () => {
    const newItem = {
      icon: 'star',
      title: 'New Feature',
      description: 'Feature description'
    };
    updateConfig('items', [...items, newItem]);
  };
  
  const updateItem = (index, updates) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    updateConfig('items', newItems);
  };
  
  const deleteItem = (index) => {
    updateConfig('items', items.filter((_, i) => i !== index));
  };
  
  return (
    <>
      <Field label="Section Title">
        <TextInput
          value={config.title}
          onChange={(v) => updateConfig('title', v)}
          placeholder="Our Features"
        />
      </Field>
      
      <Field label="Columns">
        <Select
          value={config.columns?.toString() || '3'}
          onChange={(v) => updateConfig('columns', parseInt(v))}
          options={[
            { value: '2', label: '2 Columns' },
            { value: '3', label: '3 Columns' },
            { value: '4', label: '4 Columns' }
          ]}
        />
      </Field>
      
      <Section title="Feature Items">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Feature {index + 1}</span>
                <button
                  onClick={() => deleteItem(index)}
                  className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <TextInput
                value={item.title}
                onChange={(v) => updateItem(index, { title: v })}
                placeholder="Feature title"
              />
              
              <TextArea
                value={item.description}
                onChange={(v) => updateItem(index, { description: v })}
                placeholder="Description"
                rows={2}
              />
            </div>
          ))}
        </div>
        
        <button
          onClick={addItem}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Feature
        </button>
      </Section>
    </>
  );
}

function TestimonialEditor({ config, updateConfig }) {
  return (
    <>
      <Field label="Quote">
        <TextArea
          value={config.quote}
          onChange={(v) => updateConfig('quote', v)}
          placeholder="Customer testimonial..."
          rows={3}
        />
      </Field>
      
      <Field label="Author Name">
        <TextInput
          value={config.author}
          onChange={(v) => updateConfig('author', v)}
          placeholder="Jane Smith"
        />
      </Field>
      
      <Field label="Role / Company">
        <TextInput
          value={config.role}
          onChange={(v) => updateConfig('role', v)}
          placeholder="CEO, Example Inc."
        />
      </Field>
      
      <Field label="Avatar URL">
        <TextInput
          value={config.avatar}
          onChange={(v) => updateConfig('avatar', v)}
          placeholder="https://..."
          type="url"
        />
      </Field>
      
      <Field label="Rating (1-5)">
        <input
          type="range"
          min="1"
          max="5"
          value={config.rating || 5}
          onChange={(e) => updateConfig('rating', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="text-center text-sm text-gray-500">{config.rating || 5} stars</div>
      </Field>
    </>
  );
}

function DividerEditor({ config, updateConfig }) {
  return (
    <>
      <Field label="Style">
        <Select
          value={config.style}
          onChange={(v) => updateConfig('style', v)}
          options={[
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' }
          ]}
        />
      </Field>
      
      <Field label="Color">
        <input
          type="color"
          value={config.color || '#e5e7eb'}
          onChange={(e) => updateConfig('color', e.target.value)}
          className="w-full h-10 rounded cursor-pointer"
        />
      </Field>
      
      <Field label="Thickness (px)">
        <input
          type="number"
          min="1"
          max="10"
          value={config.thickness || 1}
          onChange={(e) => updateConfig('thickness', parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
        />
      </Field>
      
      <Field label="Width">
        <TextInput
          value={config.width}
          onChange={(v) => updateConfig('width', v)}
          placeholder="100% or 50%"
        />
      </Field>
    </>
  );
}

function SpacerEditor({ config, updateConfig }) {
  return (
    <Field label="Height">
      <Select
        value={config.height}
        onChange={(v) => updateConfig('height', v)}
        options={[
          { value: '1rem', label: 'Extra Small (1rem)' },
          { value: '2rem', label: 'Small (2rem)' },
          { value: '4rem', label: 'Medium (4rem)' },
          { value: '6rem', label: 'Large (6rem)' },
          { value: '8rem', label: 'Extra Large (8rem)' }
        ]}
      />
    </Field>
  );
}
