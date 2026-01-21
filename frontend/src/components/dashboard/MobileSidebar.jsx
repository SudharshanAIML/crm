import { memo } from 'react';
import Sidebar from '../layout/Sidebar';

/**
 * Mobile sidebar overlay component
 * Shows sidebar in a modal overlay for mobile devices
 */
const MobileSidebar = memo(({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar Panel */}
      <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
        <Sidebar
          collapsed={false}
          onToggle={onClose}
        />
      </div>
    </div>
  );
});

MobileSidebar.displayName = 'MobileSidebar';

export default MobileSidebar;
