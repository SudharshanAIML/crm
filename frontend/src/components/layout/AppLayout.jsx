import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const AppLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Calculate sidebar width for main content margin (narrower now without pipeline)
  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 64 : 224);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
      {/* Fixed Header - Always at top */}
      <Header onMenuToggle={toggleSidebar} showMenuButton={isMobile} />
      
      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed top-16 h-[calc(100vh-4rem)] z-40 transition-all duration-300 ease-in-out ${
          isMobile 
            ? mobileMenuOpen ? 'left-0' : '-left-56'
            : 'left-0'
        }`}
        style={{ width: isMobile ? 224 : (sidebarCollapsed ? 64 : 224) }}
      >
        <Sidebar 
          collapsed={isMobile ? false : sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>
      
      {/* Main Content - Adjusts based on sidebar state */}
      <main 
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarWidth, paddingTop: '4rem' }}
      >
        <div className="p-4 md:p-6">
          {typeof children === 'function' 
            ? children({ sidebarCollapsed }) 
            : children
          }
        </div>
      </main>
    </div>
  );
};

export default AppLayout;