import { memo, useCallback } from 'react';
import Sidebar from '../layout/Sidebar';

/**
 * Mobile sidebar overlay component
 * Shows sidebar in a modal overlay for mobile devices
 */
const MobileSidebar = memo(({
  isOpen,
  onClose,
  activeStage,
  onStageChange,
  activeView,
  onViewChange,
}) => {
  if (!isOpen) return null;

  // Wrap handlers to close mobile menu after navigation
  const handleStageChange = useCallback((stage) => {
    onStageChange?.(stage);
  }, [onStageChange]);

  const handleViewChange = useCallback((view) => {
    onViewChange?.(view);
  }, [onViewChange]);

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar Panel */}
      <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
        <Sidebar
          activeStage={activeStage}
          onStageChange={handleStageChange}
          collapsed={false}
          onToggle={onClose}
          onViewChange={handleViewChange}
          activeView={activeView}
        />
      </div>
    </div>
  );
});

MobileSidebar.displayName = 'MobileSidebar';

export default MobileSidebar;
