/**
 * Gradient Picker Component
 * Simple two-color gradient selector with direction control
 */
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import ColorPicker from './ColorPicker';

// Direction options
const DIRECTIONS = [
  { value: 'to-r', label: 'Right', icon: '→' },
  { value: 'to-br', label: 'Bottom Right', icon: '↘' },
  { value: 'to-b', label: 'Bottom', icon: '↓' },
  { value: 'to-bl', label: 'Bottom Left', icon: '↙' },
  { value: 'to-l', label: 'Left', icon: '←' },
  { value: 'to-tl', label: 'Top Left', icon: '↖' },
  { value: 'to-t', label: 'Top', icon: '↑' },
  { value: 'to-tr', label: 'Top Right', icon: '↗' },
];

const getGradientCSS = (colors, direction) => {
  const directionMap = {
    'to-r': 'to right',
    'to-l': 'to left',
    'to-t': 'to top',
    'to-b': 'to bottom',
    'to-br': 'to bottom right',
    'to-bl': 'to bottom left',
    'to-tr': 'to top right',
    'to-tl': 'to top left',
  };
  return `linear-gradient(${directionMap[direction] || 'to bottom right'}, ${colors.join(', ')})`;
};

export default function GradientPicker({ value, onChange, label }) {
  const [showDirections, setShowDirections] = useState(false);
  
  // Parse existing gradient value
  const parseGradientValue = (val) => {
    if (!val || typeof val !== 'object') {
      return { colors: ['#0ea5e9', '#2563eb'], direction: 'to-br' };
    }
    return val;
  };
  
  const currentGradient = parseGradientValue(value);
  const [fromColor, toColor] = currentGradient.colors;
  
  const updateFromColor = (color) => {
    onChange({
      colors: [color, toColor],
      direction: currentGradient.direction
    });
  };
  
  const updateToColor = (color) => {
    onChange({
      colors: [fromColor, color],
      direction: currentGradient.direction
    });
  };
  
  const updateDirection = (direction) => {
    onChange({
      colors: currentGradient.colors,
      direction
    });
    setShowDirections(false);
  };
  
  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      
      {/* Gradient Preview */}
      <div 
        className="w-full h-12 rounded-lg border-2 border-gray-200 shadow-sm" 
        style={{ background: getGradientCSS(currentGradient.colors, currentGradient.direction) }}
      />
      
      {/* Two Color Pickers - Stacked for better alignment */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <ColorPicker
            value={fromColor}
            onChange={updateFromColor}
            label="From"
            compact={false}
            alignPopup="left"
          />
        </div>
        
        <div>
          <ColorPicker
            value={toColor}
            onChange={updateToColor}
            label="To"
            compact={false}
            alignPopup="right"
          />
        </div>
      </div>
      
      {/* Direction Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
        <div className="grid grid-cols-4 gap-2">
          {DIRECTIONS.map((dir) => (
            <button
              key={dir.value}
              type="button"
              onClick={() => updateDirection(dir.value)}
              className={`px-3 py-2 text-lg rounded-lg border-2 transition-all ${
                currentGradient.direction === dir.value
                  ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              title={dir.label}
            >
              {dir.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
